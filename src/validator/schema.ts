/**
 * Zod schemas for validating raw .ui.yaml component objects.
 */

import { z } from 'zod';

/** Prop type enum */
const propTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'enum',
  'object',
  'array',
  'function',
]);

/** Single prop definition */
const propSchema = z.object({
  type: propTypeSchema,
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  values: z.array(z.string()).optional(),
  description: z.string().optional(),
}).refine(
  (data) => data.type !== 'enum' || (data.values && data.values.length > 0),
  { message: 'Enum props must have a non-empty "values" array' },
);

/** State definition */
const stateSchema = z.object({
  type: z.string(),
  initial: z.unknown(),
});

/** Event definition */
const eventSchema = z.object({
  payload: z.record(z.string(), z.string()).optional().default({}),
  description: z.string().optional(),
});

/** Slot definition */
const slotSchema = z.object({
  description: z.string().optional(),
  fallback: z.string().optional(),
});

/** Class conditionals */
const classConditionalSchema = z.object({
  when: z.string(),
  add: z.string(),
  remove: z.string().optional(),
});

/** Class definition — can be a string or full object */
const classDefinitionSchema = z.union([
  z.string(),
  z.object({
    base: z.string().optional().default(''),
    variants: z.record(z.string(), z.record(z.string(), z.string())).optional(),
    conditionals: z.array(classConditionalSchema).optional(),
  }),
]);

/** Template node (recursive) */
const templateNodeSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z.object({
    tag: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    classes: classDefinitionSchema.optional(),
    on: z.record(z.string(), z.string()).optional(),
    children: z.array(templateNodeSchema).optional(),
    content: z.string().optional(),
    when: z.string().optional(),
    slot: z.string().optional(),
    ref: z.string().optional(),
  }),
);

/** Test assertion */
const testAssertionSchema = z.object({
  selector: z.string().optional(),
  textContent: z.string().optional(),
  hasClass: z.string().optional(),
  exists: z.boolean().optional(),
  eventEmitted: z.string().optional(),
  times: z.number().optional(),
});

/** Test definition */
const testDefinitionSchema = z.object({
  name: z.string(),
  props: z.record(z.string(), z.unknown()).optional().default({}),
  simulate: z.object({
    event: z.string(),
    target: z.string().optional(),
  }).optional(),
  assert: z.array(testAssertionSchema),
});

/** Import definition */
const importDefinitionSchema = z.object({
  from: z.string(),
  names: z.array(z.string()),
});

/** Computed definition */
const computedDefinitionSchema = z.object({
  expression: z.string(),
  dependencies: z.array(z.string()).optional(),
});

/** Lifecycle hooks */
const lifecycleSchema = z.object({
  onMount: z.string().optional(),
  onUnmount: z.string().optional(),
}).optional();

/** Top-level component schema */
export const componentSchema = z.object({
  component: z.string().min(1, 'Component name is required'),
  version: z.string().optional().default('1.0.0'),
  description: z.string().optional(),

  props: z.record(z.string(), propSchema).optional().default({}),
  state: z.record(z.string(), stateSchema).optional().default({}),
  events: z.record(z.string(), eventSchema).optional().default({}),
  slots: z.record(z.string(), slotSchema).optional().default({}),
  template: templateNodeSchema,
  lifecycle: lifecycleSchema,
  tests: z.array(testDefinitionSchema).optional().default([]),
  imports: z.array(importDefinitionSchema).optional().default([]),
  computed: z.record(z.string(), computedDefinitionSchema).optional().default({}),
});

/** Inferred raw component type from zod schema */
export type RawComponent = z.input<typeof componentSchema>;
export type ValidatedComponent = z.output<typeof componentSchema>;
