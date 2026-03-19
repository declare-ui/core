/**
 * React code generator — produces idiomatic .tsx with hooks and forwardRef.
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
import { getCnSource } from '../utils/cn.js';
import { indent, toKebabCase } from '../utils/codegen.js';

/**
 * Generates React .tsx component files from ComponentAST.
 */
export class ReactGenerator extends BaseGenerator {
  generate(ast: ComponentAST): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const name = ast.meta.name;
    const kebabName = toKebabCase(name);

    // Main component file
    files.push({
      filename: `${kebabName}.tsx`,
      content: this.generateComponent(ast),
      language: 'tsx',
    });

    // cn utility file
    files.push({
      filename: 'cn.ts',
      content: `${this.getHeader()}\n\n${getCnSource()}\n`,
      language: 'typescript',
    });

    return files;
  }

  private generateComponent(ast: ComponentAST): string {
    const { meta, props, state, events, slots } = ast;
    const name = meta.name;

    const parts: string[] = [];

    // Header
    parts.push(this.getHeader());
    parts.push('');

    // Imports
    parts.push(this.generateImports(ast));
    parts.push('');

    // Props interface
    parts.push(this.generatePropsInterface(name, props, events, slots));
    parts.push('');

    // Component
    parts.push(this.generateComponentBody(ast));
    parts.push('');

    // Display name
    parts.push(`${name}.displayName = '${name}';`);
    parts.push('');

    return parts.join('\n');
  }

  private generateImports(ast: ComponentAST): string {
    const reactImports = new Set<string>();
    reactImports.add('forwardRef');

    if (ast.state.length > 0) {
      reactImports.add('useState');
    }

    // Check for event types in events
    const eventTypeImports = new Set<string>();
    for (const event of ast.events) {
      for (const payloadType of Object.values(event.payload)) {
        if (payloadType === 'MouseEvent') {
          eventTypeImports.add('type MouseEvent');
        } else if (payloadType === 'KeyboardEvent') {
          eventTypeImports.add('type KeyboardEvent');
        }
      }
    }

    const allReactImports = [...reactImports, ...eventTypeImports].join(', ');

    const lines: string[] = [];
    lines.push(`import { ${allReactImports} } from 'react';`);
    lines.push(`import { cn } from './cn.js';`);

    return lines.join('\n');
  }

  private generatePropsInterface(
    name: string,
    props: PropDefinition[],
    events: ComponentAST['events'],
    slots: ComponentAST['slots'],
  ): string {
    const lines: string[] = [];
    lines.push(`export interface ${name}Props {`);

    // Props
    for (const prop of props) {
      const optional = !prop.required ? '?' : '';
      const type = this.mapPropType(prop);
      lines.push(`  ${prop.name}${optional}: ${type};`);
    }

    // Event callbacks
    for (const event of events) {
      const payloadEntries = Object.entries(event.payload);
      const payloadType = payloadEntries.length > 0
        ? `{ ${payloadEntries.map(([k, v]) => `${k}: ${v}`).join('; ')} }`
        : 'void';
      const callbackName = `on${event.name.charAt(0).toUpperCase()}${event.name.slice(1)}`;
      lines.push(`  ${callbackName}?: (payload: ${payloadType}) => void;`);
    }

    // Slots as props
    const hasDefaultSlot = slots.some((s) => s.name === 'default');
    if (hasDefaultSlot) {
      lines.push(`  children?: React.ReactNode;`);
    }
    for (const slot of slots) {
      if (slot.name !== 'default') {
        lines.push(`  ${slot.name}?: React.ReactNode;`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  private generateComponentBody(ast: ComponentAST): string {
    const { meta, props, state } = ast;
    const name = meta.name;

    const lines: string[] = [];

    // Destructuring defaults
    const propDefaults = props
      .filter((p) => p.default !== undefined)
      .map((p) => {
        const val = typeof p.default === 'string' ? `'${p.default}'` : String(p.default);
        return `${p.name} = ${val}`;
      });
    const requiredProps = props.filter((p) => p.required).map((p) => p.name);

    // Event callback names
    const eventCallbacks = ast.events.map(
      (e) => `on${e.name.charAt(0).toUpperCase()}${e.name.slice(1)}`,
    );

    // Slot props
    const slotProps: string[] = [];
    const hasDefaultSlot = ast.slots.some((s) => s.name === 'default');
    if (hasDefaultSlot) {
      slotProps.push('children');
    }
    for (const slot of ast.slots) {
      if (slot.name !== 'default') {
        slotProps.push(slot.name);
      }
    }

    const allDestructured = [
      ...requiredProps,
      ...propDefaults,
      ...eventCallbacks,
      ...slotProps,
    ].join(', ');

    lines.push(`export const ${name} = forwardRef<HTMLElement, ${name}Props>(function ${name}(`);
    lines.push(`  { ${allDestructured} },`);
    lines.push(`  ref,`);
    lines.push(`) {`);

    // State hooks
    for (const s of state) {
      const initial = typeof s.initial === 'string' ? `'${s.initial}'` : String(s.initial);
      const setter = `set${s.name.charAt(0).toUpperCase()}${s.name.slice(1)}`;
      lines.push(`  const [${s.name}, ${setter}] = useState(${initial});`);
    }

    if (state.length > 0) {
      lines.push('');
    }

    // Event handler functions
    const handlerLines = this.generateHandlers(ast);
    if (handlerLines) {
      lines.push(handlerLines);
      lines.push('');
    }

    // Class name computation
    const classLine = this.generateClassName(ast.template);
    if (classLine) {
      lines.push(`  const className = ${classLine};`);
      lines.push('');
    }

    // JSX return
    lines.push(`  return (`);
    lines.push(indent(this.generateJSX(ast.template, ast), 2));
    lines.push(`  );`);
    lines.push(`});`);

    return lines.join('\n');
  }

  private generateHandlers(ast: ComponentAST): string {
    const handlers = ast.template.on;
    if (Object.keys(handlers).length === 0) return '';

    const lines: string[] = [];
    for (const [event, expr] of Object.entries(handlers)) {
      const handlerName = `handle${event.charAt(0).toUpperCase()}${event.slice(1)}`;
      const body = this.transformHandler(expr, ast);
      lines.push(`  const ${handlerName} = (event: React.MouseEvent) => {`);
      lines.push(indent(body, 2));
      lines.push(`  };`);
    }
    return lines.join('\n');
  }

  private transformHandler(expr: Expression, ast: ComponentAST): string {
    let code = expr.raw.trim();

    // Transform $emit('eventName', payload) → onEventName?.(payload)
    code = code.replace(
      /\$emit\(\s*'(\w+)'\s*,\s*(\{[^}]*\})\s*\)/g,
      (_match, eventName: string, payload: string) => {
        const callbackName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
        const transformedPayload = payload
          .replace(/\$event/g, 'event');
        return `${callbackName}?.(${transformedPayload})`;
      },
    );

    // Transform $state.x = value → setX(value)
    code = code.replace(
      /\$state\.(\w+)\s*=\s*(.+)/g,
      (_match, stateName: string, value: string) => {
        const setter = `set${stateName.charAt(0).toUpperCase()}${stateName.slice(1)}`;
        return `${setter}(${value.trim()})`;
      },
    );

    // Transform remaining references
    code = code.replace(/\$props\.(\w+)/g, '$1');
    code = code.replace(/\$state\.(\w+)/g, '$1');
    code = code.replace(/\$event/g, 'event');

    return code;
  }

  private generateClassName(template: TemplateNode): string | null {
    const classes = template.classes;
    if (!classes.base && !classes.variants && !classes.conditionals) {
      return null;
    }

    const parts: string[] = [];

    // Base
    if (classes.base) {
      parts.push(`'${classes.base}'`);
    }

    // Variants: select class based on prop value
    if (classes.variants) {
      for (const [propName, variants] of Object.entries(classes.variants)) {
        const entries = Object.entries(variants);
        const mapping = `{ ${entries.map(([k, v]) => `'${k}': '${v}'`).join(', ')} }`;
        parts.push(`${mapping}[${propName}]`);
      }
    }

    // Conditionals
    if (classes.conditionals) {
      for (const cond of classes.conditionals) {
        const condition = cond.when
          .replace(/\$props\.(\w+)/g, '$1')
          .replace(/\$state\.(\w+)/g, '$1');
        parts.push(`${condition} && '${cond.add}'`);
      }
    }

    return `cn(\n${parts.map((p) => `      ${p},`).join('\n')}\n    )`;
  }

  private generateJSX(
    template: TemplateNode,
    ast: ComponentAST,
  ): string {
    const tag = template.tag;
    const attrParts: string[] = [];

    // Ref
    attrParts.push('ref={ref}');

    // Attrs
    for (const [key, value] of Object.entries(template.attrs)) {
      if (typeof value === 'string') {
        attrParts.push(`${key}="${value}"`);
      } else {
        const transformed = this.transformExpression(value);
        attrParts.push(`${key}={${transformed}}`);
      }
    }

    // className
    if (template.classes.base || template.classes.variants || template.classes.conditionals) {
      attrParts.push(`className={className}`);
    }

    // Event handlers
    for (const event of Object.keys(template.on)) {
      const handlerName = `handle${event.charAt(0).toUpperCase()}${event.slice(1)}`;
      const reactEvent = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
      attrParts.push(`${reactEvent}={${handlerName}}`);
    }

    const attrs = attrParts.join(' ');

    // Children
    const childrenJSX = this.generateChildren(template.children, ast);

    if (childrenJSX) {
      return `<${tag} ${attrs}>\n${indent(childrenJSX, 1)}\n</${tag}>`;
    }
    return `<${tag} ${attrs} />`;
  }

  private generateChildren(
    children: (TemplateNode | ConditionalNode | SlotReference | TextNode)[],
    ast: ComponentAST,
  ): string {
    if (children.length === 0) return '';

    const parts: string[] = [];

    for (const child of children) {
      if ('type' in child) {
        switch (child.type) {
          case 'text':
            parts.push(`{${this.transformExpression(child.content)}}`);
            break;
          case 'slot':
            if (child.name === 'default') {
              parts.push('{children}');
            } else {
              parts.push(`{${child.name}}`);
            }
            break;
          case 'conditional':
            parts.push(this.generateConditionalJSX(child, ast));
            break;
        }
      } else {
        // Regular TemplateNode
        parts.push(this.generateChildElement(child, ast));
      }
    }

    return parts.join('\n');
  }

  private generateConditionalJSX(node: ConditionalNode, ast: ComponentAST): string {
    const condition = this.transformExpression(node.when);
    const tag = node.tag;

    const attrParts: string[] = [];
    for (const [key, value] of Object.entries(node.attrs)) {
      if (typeof value === 'string') {
        attrParts.push(`${key}="${value}"`);
      } else {
        attrParts.push(`${key}={${this.transformExpression(value)}}`);
      }
    }

    // Classes
    if (node.classes) {
      if (typeof node.classes === 'string') {
        attrParts.push(`className="${node.classes}"`);
      }
    }

    const attrs = attrParts.length > 0 ? ` ${attrParts.join(' ')}` : '';

    // Content
    if (node.content) {
      const content = this.transformExpression(node.content);
      return `{${condition} && <${tag}${attrs}>{${content}}</${tag}>}`;
    }

    if (node.children.length > 0) {
      const childContent = this.generateChildren(node.children, ast);
      return `{${condition} && <${tag}${attrs}>${childContent}</${tag}>}`;
    }

    return `{${condition} && <${tag}${attrs} />}`;
  }

  private generateChildElement(node: TemplateNode, ast: ComponentAST): string {
    const attrParts: string[] = [];

    for (const [key, value] of Object.entries(node.attrs)) {
      if (typeof value === 'string') {
        attrParts.push(`${key}="${value}"`);
      } else {
        attrParts.push(`${key}={${this.transformExpression(value)}}`);
      }
    }

    // Simple string classes
    if (node.classes.base) {
      attrParts.push(`className="${node.classes.base}"`);
    }

    const attrs = attrParts.length > 0 ? ` ${attrParts.join(' ')}` : '';

    // Children / content
    const childContent = this.generateChildren(node.children, ast);
    if (childContent) {
      return `<${node.tag}${attrs}>${childContent}</${node.tag}>`;
    }

    return `<${node.tag}${attrs} />`;
  }

  /** Override to handle React-specific expression transforms */
  protected override transformExpression(expr: Expression | string): string {
    const raw = typeof expr === 'string' ? expr : expr.raw;
    return raw
      .replace(/\$props\.(\w+)/g, '$1')
      .replace(/\$state\.(\w+)/g, '$1')
      .replace(/\$event/g, 'event');
  }
}
