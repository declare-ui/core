/**
 * Web Components generator — produces Custom Elements with Shadow DOM.
 */

import type {
  ComponentAST,
  ConditionalNode,
  Expression,
  GeneratedFile,
  PropDefinition,
  SlotReference,
  TemplateNode,
  TextNode,
} from '../ast/types.js';
import { BaseGenerator } from './base.js';
import { indent, toKebabCase, toPascalCase } from '../utils/codegen.js';

/**
 * Generates Web Component (.ts) files from ComponentAST.
 */
export class WCGenerator extends BaseGenerator {
  generate(ast: ComponentAST): GeneratedFile[] {
    const kebabName = toKebabCase(ast.meta.name);

    return [{
      filename: `${kebabName}.ts`,
      content: this.generateComponent(ast),
      language: 'typescript',
    }];
  }

  private generateComponent(ast: ComponentAST): string {
    const { meta, props, state, events } = ast;
    const className = `Dui${toPascalCase(meta.name)}`;
    const tagName = `dui-${toKebabCase(meta.name)}`;

    const parts: string[] = [];

    parts.push(this.getHeader());
    parts.push('');

    // Class definition
    parts.push(`class ${className} extends HTMLElement {`);

    // Observed attributes
    const attrNames = props.map((p) => `'${toKebabCase(p.name)}'`);
    parts.push(`  static observedAttributes = [${attrNames.join(', ')}];`);
    parts.push('');

    // Private state
    if (state.length > 0) {
      const stateEntries = state.map((s) => {
        const initial = typeof s.initial === 'string' ? `'${s.initial}'` : String(s.initial);
        return `${s.name}: ${initial}`;
      });
      parts.push(`  #state: { ${stateEntries.join('; ')} } = { ${stateEntries.join(', ')} };`);
      parts.push('');
    }

    // Shadow root reference
    parts.push(`  #shadow: ShadowRoot;`);
    parts.push('');

    // Constructor
    parts.push(`  constructor() {`);
    parts.push(`    super();`);
    parts.push(`    this.#shadow = this.attachShadow({ mode: 'open' });`);
    parts.push(`  }`);
    parts.push('');

    // connectedCallback
    parts.push(`  connectedCallback() {`);
    parts.push(`    this.#render();`);
    if (ast.lifecycle.onMount) {
      parts.push(`    ${this.transformExpression(ast.lifecycle.onMount)}`);
    }
    parts.push(`  }`);
    parts.push('');

    // disconnectedCallback
    parts.push(`  disconnectedCallback() {`);
    if (ast.lifecycle.onUnmount) {
      parts.push(`    ${this.transformExpression(ast.lifecycle.onUnmount)}`);
    }
    parts.push(`  }`);
    parts.push('');

    // attributeChangedCallback
    parts.push(`  attributeChangedCallback(_name: string, _oldValue: string | null, _newValue: string | null) {`);
    parts.push(`    this.#render();`);
    parts.push(`  }`);
    parts.push('');

    // Prop getters/setters
    for (const prop of props) {
      const attrName = toKebabCase(prop.name);
      parts.push(this.generatePropAccessor(prop, attrName));
    }

    // Event emitter helper
    if (events.length > 0) {
      parts.push(`  #emit(name: string, detail: unknown) {`);
      parts.push(`    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));`);
      parts.push(`  }`);
      parts.push('');
    }

    // Render method
    parts.push(this.generateRenderMethod(ast));

    parts.push('}');
    parts.push('');

    // Registration
    parts.push(`customElements.define('${tagName}', ${className});`);
    parts.push('');

    return parts.join('\n');
  }

  private generatePropAccessor(prop: PropDefinition, attrName: string): string {
    const lines: string[] = [];

    if (prop.type === 'boolean') {
      lines.push(`  get ${prop.name}(): boolean {`);
      lines.push(`    return this.hasAttribute('${attrName}');`);
      lines.push(`  }`);
      lines.push('');
      lines.push(`  set ${prop.name}(value: boolean) {`);
      lines.push(`    if (value) {`);
      lines.push(`      this.setAttribute('${attrName}', '');`);
      lines.push(`    } else {`);
      lines.push(`      this.removeAttribute('${attrName}');`);
      lines.push(`    }`);
      lines.push(`  }`);
    } else {
      const defaultVal = prop.default !== undefined
        ? (typeof prop.default === 'string' ? `'${prop.default}'` : String(prop.default))
        : `''`;
      lines.push(`  get ${prop.name}(): string {`);
      lines.push(`    return this.getAttribute('${attrName}') ?? ${defaultVal};`);
      lines.push(`  }`);
      lines.push('');
      lines.push(`  set ${prop.name}(value: string) {`);
      lines.push(`    this.setAttribute('${attrName}', value);`);
      lines.push(`  }`);
    }

    lines.push('');
    return lines.join('\n');
  }

  private generateRenderMethod(ast: ComponentAST): string {
    const lines: string[] = [];
    lines.push(`  #render() {`);

    // Build classes for the root element
    const classExpr = this.buildClassExpression(ast.template);

    lines.push(`    const el = document.createElement('${ast.template.tag}');`);

    // Set attributes
    for (const [key, value] of Object.entries(ast.template.attrs)) {
      if (typeof value === 'string') {
        lines.push(`    el.setAttribute('${key}', '${value}');`);
      } else {
        const transformed = this.transformWCExpression(value);
        lines.push(`    el.setAttribute('${key}', String(${transformed}));`);
      }
    }

    // Set class
    if (classExpr) {
      lines.push(`    el.className = ${classExpr};`);
    }

    // Event listeners
    for (const [event, expr] of Object.entries(ast.template.on)) {
      const body = this.transformWCHandler(expr, ast);
      lines.push(`    el.addEventListener('${event}', (event) => {`);
      lines.push(indent(body, 3));
      lines.push(`    });`);
    }

    // Children
    this.generateChildCreation(ast.template.children, 'el', lines, 2, ast);

    // Clear and append
    lines.push('');
    lines.push(`    // Placeholder styles (Tailwind JIT integration in future)`);
    lines.push(`    const style = document.createElement('style');`);
    lines.push(`    style.textContent = ':host { display: inline-block; }';`);
    lines.push('');
    lines.push(`    this.#shadow.replaceChildren(style, el);`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  private buildClassExpression(template: TemplateNode): string | null {
    const parts: string[] = [];
    const classes = template.classes;

    if (classes.base) {
      parts.push(`'${classes.base}'`);
    }

    if (classes.variants) {
      for (const [propName, variants] of Object.entries(classes.variants)) {
        const entries = Object.entries(variants);
        const mapping = `{ ${entries.map(([k, v]) => `'${k}': '${v}'`).join(', ')} }`;
        parts.push(`(${mapping}[this.${propName}] ?? '')`);
      }
    }

    if (classes.conditionals) {
      for (const cond of classes.conditionals) {
        const condition = cond.when
          .replace(/\$props\.(\w+)/g, 'this.$1')
          .replace(/\$state\.(\w+)/g, 'this.#state.$1');
        parts.push(`(${condition} ? '${cond.add}' : '')`);
      }
    }

    if (parts.length === 0) return null;
    return `[${parts.join(', ')}].filter(Boolean).join(' ')`;
  }

  private transformWCExpression(expr: Expression | string): string {
    const raw = typeof expr === 'string' ? expr : expr.raw;
    return raw
      .replace(/\$props\.(\w+)/g, 'this.$1')
      .replace(/\$state\.(\w+)/g, 'this.#state.$1')
      .replace(/\$event/g, 'event');
  }

  private transformWCHandler(expr: Expression, ast: ComponentAST): string {
    let code = expr.raw.trim();

    // Transform $emit → this.#emit
    code = code.replace(
      /\$emit\(\s*'(\w+)'\s*,\s*(\{[^}]*\})\s*\)/g,
      (_match, eventName: string, payload: string) => {
        const transformedPayload = payload.replace(/\$event/g, 'event');
        return `this.#emit('${eventName}', ${transformedPayload})`;
      },
    );

    // Transform $state.x = value
    code = code.replace(
      /\$state\.(\w+)\s*=\s*(.+)/g,
      (_match, stateName: string, value: string) => {
        return `this.#state.${stateName} = ${value.trim()}; this.#render()`;
      },
    );

    code = code.replace(/\$props\.(\w+)/g, 'this.$1');
    code = code.replace(/\$state\.(\w+)/g, 'this.#state.$1');
    code = code.replace(/\$event/g, 'event');

    return code;
  }

  private generateChildCreation(
    children: (TemplateNode | ConditionalNode | SlotReference | TextNode)[],
    parentVar: string,
    lines: string[],
    indentLevel: number,
    ast: ComponentAST,
  ): void {
    const pad = '  '.repeat(indentLevel);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childVar = `${parentVar}_child${i}`;

      if ('type' in child) {
        switch (child.type) {
          case 'text': {
            const content = this.transformWCExpression(child.content);
            lines.push(`${pad}${parentVar}.appendChild(document.createTextNode(String(${content})));`);
            break;
          }
          case 'slot': {
            lines.push(`${pad}const ${childVar} = document.createElement('slot');`);
            if (child.name !== 'default') {
              lines.push(`${pad}${childVar}.name = '${child.name}';`);
            }
            lines.push(`${pad}${parentVar}.appendChild(${childVar});`);
            break;
          }
          case 'conditional': {
            const condition = this.transformWCExpression(child.when);
            lines.push(`${pad}if (${condition}) {`);
            lines.push(`${pad}  const ${childVar} = document.createElement('${child.tag}');`);

            // Attrs
            for (const [key, value] of Object.entries(child.attrs)) {
              if (typeof value === 'string') {
                lines.push(`${pad}  ${childVar}.setAttribute('${key}', '${value}');`);
              } else {
                lines.push(`${pad}  ${childVar}.setAttribute('${key}', String(${this.transformWCExpression(value)}));`);
              }
            }

            // Classes
            if (child.classes) {
              if (typeof child.classes === 'string') {
                lines.push(`${pad}  ${childVar}.className = '${child.classes}';`);
              }
            }

            // Content
            if (child.content) {
              const content = this.transformWCExpression(child.content);
              lines.push(`${pad}  ${childVar}.textContent = String(${content});`);
            }

            lines.push(`${pad}  ${parentVar}.appendChild(${childVar});`);
            lines.push(`${pad}}`);
            break;
          }
        }
      } else {
        // Regular TemplateNode
        lines.push(`${pad}const ${childVar} = document.createElement('${child.tag}');`);

        for (const [key, value] of Object.entries(child.attrs)) {
          if (typeof value === 'string') {
            lines.push(`${pad}${childVar}.setAttribute('${key}', '${value}');`);
          } else {
            lines.push(`${pad}${childVar}.setAttribute('${key}', String(${this.transformWCExpression(value)}));`);
          }
        }

        if (child.classes.base) {
          lines.push(`${pad}${childVar}.className = '${child.classes.base}';`);
        }

        // Recurse children
        this.generateChildCreation(child.children, childVar, lines, indentLevel, ast);

        lines.push(`${pad}${parentVar}.appendChild(${childVar});`);
      }
    }
  }
}
