/**
 * Validator module — transforms raw component objects into typed ComponentAST.
 */

import type {
  ComponentAST,
  ClassDefinition,
  ConditionalNode,
  Expression,
  PropDefinition,
  SlotReference,
  TemplateNode,
  TextNode,
} from '../ast/types.js';
import { DeclareUIValidationError } from '../errors.js';
import { parseExpression } from './expression-parser.js';
import { componentSchema, type RawComponent } from './schema.js';

/**
 * Validate a raw component object and transform it into a ComponentAST.
 *
 * @param raw - Raw parsed component object (from YAML/JSON)
 * @returns Validated and typed ComponentAST
 * @throws DeclareUIValidationError on validation failure
 */
export function validateComponent(raw: RawComponent): ComponentAST {
  const result = componentSchema.safeParse(raw);

  if (!result.success) {
    const issue = result.error.issues[0];
    throw new DeclareUIValidationError({
      code: 'VALIDATION_ERROR',
      message: issue
        ? `${issue.message} at ${String(issue.path.join('.'))}`
        : 'Unknown validation error',
      path: issue ? String(issue.path.join('.')) : undefined,
    });
  }

  const validated = result.data;

  try {
    return buildAST(validated);
  } catch (error) {
    if (error instanceof DeclareUIValidationError) {
      throw error;
    }
    throw new DeclareUIValidationError({
      code: 'AST_BUILD_ERROR',
      message: `Failed to build AST: ${String(error)}`,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** Build the full ComponentAST from validated data */
function buildAST(data: AnyRecord): ComponentAST {
  return {
    meta: {
      name: data.component,
      version: data.version,
      description: data.description,
    },
    props: buildProps(data.props ?? {}),
    state: Object.entries(data.state ?? {} as AnyRecord).map(([name, rawDef]) => {
      const def = rawDef as AnyRecord;
      return { name, type: def.type, initial: def.initial };
    }),
    events: Object.entries(data.events ?? {} as AnyRecord).map(([name, rawDef]) => {
      const def = rawDef as AnyRecord;
      return { name, payload: def.payload ?? {}, description: def.description };
    }),
    slots: Object.entries(data.slots ?? {} as AnyRecord).map(([name, rawDef]) => {
      const def = rawDef as AnyRecord;
      return { name, description: def.description, fallback: def.fallback };
    }),
    template: buildTemplateNode(data.template),
    lifecycle: {
      onMount: data.lifecycle?.onMount,
      onUnmount: data.lifecycle?.onUnmount,
    },
    tests: (data.tests ?? []).map((t: AnyRecord) => ({
      name: t.name,
      props: t.props ?? {},
      simulate: t.simulate,
      assert: t.assert,
    })),
    imports: (data.imports ?? []).map((i: AnyRecord) => ({
      from: i.from,
      names: i.names,
    })),
    computed: Object.entries(data.computed ?? {} as AnyRecord).map(([name, rawDef]) => {
      const def = rawDef as AnyRecord;
      const expr = parseExpression(def.expression);
      return {
        name,
        expression: expr,
        dependencies: def.dependencies ?? expr.dependencies,
      };
    }),
  };
}

/** Build prop definitions from raw props object */
function buildProps(props: AnyRecord): PropDefinition[] {
  return Object.entries(props).map(([name, def]: [string, AnyRecord]) => ({
    name,
    type: def.type as PropDefinition['type'],
    required: def.required ?? false,
    default: def.default,
    values: def.values,
    description: def.description,
  }));
}

/** Build a TemplateNode from raw template data */
function buildTemplateNode(raw: Record<string, unknown>): TemplateNode {
  const tag = (raw.tag as string) ?? 'div';
  const attrs = buildAttrs(raw.attrs as Record<string, unknown> | undefined);
  const classes = buildClasses(raw.classes);
  const on = buildHandlers(raw.on as Record<string, string> | undefined);
  const children = buildChildren(raw.children as unknown[] | undefined, raw.content as string | undefined);

  return {
    tag,
    attrs,
    classes,
    on,
    children,
    ...(raw.ref ? { ref: raw.ref as string } : {}),
  };
}

/** Build attrs, parsing expressions where needed */
function buildAttrs(
  rawAttrs: Record<string, unknown> | undefined,
): Record<string, string | Expression> {
  if (!rawAttrs) return {};

  const attrs: Record<string, string | Expression> = {};
  for (const [key, value] of Object.entries(rawAttrs)) {
    const strValue = String(value);
    if (isExpression(strValue)) {
      attrs[key] = parseExpression(strValue);
    } else {
      attrs[key] = strValue;
    }
  }
  return attrs;
}

/** Build class definition from raw classes */
function buildClasses(raw: unknown): ClassDefinition {
  if (!raw) {
    return { base: '' };
  }
  if (typeof raw === 'string') {
    return { base: raw };
  }
  const obj = raw as Record<string, unknown>;
  return {
    base: (obj.base as string) ?? '',
    variants: obj.variants as Record<string, Record<string, string>> | undefined,
    conditionals: obj.conditionals as Array<{ when: string; add: string; remove?: string }> | undefined,
  };
}

/** Build event handlers, parsing all as expressions */
function buildHandlers(
  rawOn: Record<string, string> | undefined,
): Record<string, Expression> {
  if (!rawOn) return {};

  const handlers: Record<string, Expression> = {};
  for (const [event, handler] of Object.entries(rawOn)) {
    handlers[event] = parseExpression(handler);
  }
  return handlers;
}

/** Build child nodes from raw children array */
function buildChildren(
  rawChildren: unknown[] | undefined,
  content: string | undefined,
): (TemplateNode | ConditionalNode | SlotReference | TextNode)[] {
  const children: (TemplateNode | ConditionalNode | SlotReference | TextNode)[] = [];

  if (rawChildren) {
    for (const child of rawChildren) {
      const childObj = child as Record<string, unknown>;

      // Slot reference
      if (childObj.slot) {
        children.push({
          type: 'slot',
          name: childObj.slot as string,
          fallback: childObj.fallback as string | undefined,
        } satisfies SlotReference);
        continue;
      }

      // Conditional node
      if (childObj.when) {
        children.push(buildConditionalNode(childObj));
        continue;
      }

      // Regular template node
      children.push(buildTemplateNode(childObj));
    }
  }

  // If no children but has content, add a text node
  if (content && children.length === 0) {
    children.push({
      type: 'text',
      content: parseExpression(content),
    } satisfies TextNode);
  }

  return children;
}

/** Build a conditional node */
function buildConditionalNode(raw: Record<string, unknown>): ConditionalNode {
  const classes = raw.classes;
  const childContent = raw.content as string | undefined;

  return {
    type: 'conditional',
    when: parseExpression(raw.when as string),
    tag: (raw.tag as string) ?? 'div',
    attrs: buildAttrs(raw.attrs as Record<string, unknown> | undefined),
    classes: typeof classes === 'string' ? classes : buildClasses(classes),
    on: buildHandlers(raw.on as Record<string, string> | undefined),
    children: buildChildren(raw.children as unknown[] | undefined, childContent),
    ...(childContent ? { content: parseExpression(childContent) } : {}),
    ...(raw.ref ? { ref: raw.ref as string } : {}),
  };
}

/** Check if a string is an expression (starts with $ or contains $) */
function isExpression(value: string): boolean {
  return /\$(?:props|state|emit|event|slots|refs|use|computed)/.test(value);
}
