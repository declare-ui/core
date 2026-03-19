/**
 * DeclareUI Component AST Types
 *
 * Internal representation of a parsed and validated .ui.yaml component.
 */

/** Parsed expression with metadata */
export interface Expression {
  raw: string;
  dependencies: string[];
  pure: boolean;
}

/** Top-level component AST */
export interface ComponentAST {
  meta: {
    name: string;
    version: string;
    description?: string;
  };
  props: PropDefinition[];
  state: StateDefinition[];
  events: EventDefinition[];
  slots: SlotDefinition[];
  template: TemplateNode;
  lifecycle: LifecycleHooks;
  tests: TestDefinition[];
  imports: ImportDefinition[];
  computed: ComputedDefinition[];
}

/** Prop type literals */
export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'object'
  | 'array'
  | 'function';

/** Prop definition */
export interface PropDefinition {
  name: string;
  type: PropType;
  required: boolean;
  default?: unknown;
  values?: string[];
  description?: string;
}

/** Internal state definition */
export interface StateDefinition {
  name: string;
  type: string;
  initial: unknown;
}

/** Event definition */
export interface EventDefinition {
  name: string;
  payload: Record<string, string>;
  description?: string;
}

/** Slot definition */
export interface SlotDefinition {
  name: string;
  description?: string;
  fallback?: string;
}

/** Template node (element) */
export interface TemplateNode {
  tag: string;
  attrs: Record<string, string | Expression>;
  classes: ClassDefinition;
  on: Record<string, Expression>;
  children: (TemplateNode | ConditionalNode | SlotReference | TextNode)[];
  ref?: string;
}

/** Class definition with base, variants, and conditionals */
export interface ClassDefinition {
  base: string;
  variants?: Record<string, Record<string, string>>;
  conditionals?: Array<{ when: string; add: string; remove?: string }>;
}

/** Conditional rendering node */
export interface ConditionalNode {
  type: 'conditional';
  when: Expression;
  tag: string;
  attrs: Record<string, string | Expression>;
  classes: ClassDefinition | string;
  on: Record<string, Expression>;
  children: (TemplateNode | ConditionalNode | SlotReference | TextNode)[];
  content?: Expression;
  ref?: string;
}

/** Text content node */
export interface TextNode {
  type: 'text';
  content: Expression;
}

/** Slot reference node */
export interface SlotReference {
  type: 'slot';
  name: string;
  fallback?: string;
}

/** Lifecycle hooks */
export interface LifecycleHooks {
  onMount?: string;
  onUnmount?: string;
}

/** Declarative test definition */
export interface TestDefinition {
  name: string;
  props: Record<string, unknown>;
  simulate?: { event: string; target?: string };
  assert: TestAssertion[];
}

/** Test assertion */
export interface TestAssertion {
  selector?: string;
  textContent?: string;
  hasClass?: string;
  exists?: boolean;
  eventEmitted?: string;
  times?: number;
}

/** Import definition for logic modules */
export interface ImportDefinition {
  from: string;
  names: string[];
}

/** Computed property definition */
export interface ComputedDefinition {
  name: string;
  expression: Expression;
  dependencies: string[];
}

/** Generated output file */
export interface GeneratedFile {
  filename: string;
  content: string;
  language: string;
}
