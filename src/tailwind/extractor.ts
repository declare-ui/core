/**
 * Tailwind class extractor — walks the AST and collects all Tailwind classes.
 */

import type {
  ClassDefinition,
  ComponentAST,
  ConditionalNode,
  TemplateNode,
  TextNode,
  SlotReference,
} from '../ast/types.js';

/**
 * Extract all Tailwind CSS classes from a component AST.
 *
 * @param ast - The component AST to extract classes from
 * @returns Deduplicated array of class names
 */
export function extractClasses(ast: ComponentAST): string[] {
  const classes = new Set<string>();
  walkNode(ast.template, classes);
  return Array.from(classes);
}

/** Walk a template node and collect classes */
function walkNode(
  node: TemplateNode | ConditionalNode | TextNode | SlotReference,
  classes: Set<string>,
): void {
  if ('type' in node && (node.type === 'text' || node.type === 'slot')) {
    return;
  }

  const element = node as TemplateNode | ConditionalNode;

  if (element.classes) {
    if (typeof element.classes === 'string') {
      addClasses(element.classes, classes);
    } else {
      collectFromClassDefinition(element.classes as ClassDefinition, classes);
    }
  }

  if ('children' in element && element.children) {
    for (const child of element.children) {
      walkNode(child, classes);
    }
  }
}

/** Collect classes from a ClassDefinition object */
function collectFromClassDefinition(
  classDef: ClassDefinition,
  classes: Set<string>,
): void {
  // Base classes
  if (classDef.base) {
    addClasses(classDef.base, classes);
  }

  // Variant classes
  if (classDef.variants) {
    for (const variantGroup of Object.values(classDef.variants)) {
      for (const variantClasses of Object.values(variantGroup)) {
        addClasses(variantClasses, classes);
      }
    }
  }

  // Conditional classes
  if (classDef.conditionals) {
    for (const conditional of classDef.conditionals) {
      addClasses(conditional.add, classes);
      if (conditional.remove) {
        addClasses(conditional.remove, classes);
      }
    }
  }
}

/** Split a class string and add individual classes to the set */
function addClasses(classString: string, classes: Set<string>): void {
  for (const cls of classString.split(/\s+/)) {
    if (cls) {
      classes.add(cls);
    }
  }
}
