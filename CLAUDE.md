# DeclareUI Core — Project Context

> This file is read automatically by Claude Code. It contains architecture decisions, specifications, and conventions established during project planning.

## What is DeclareUI?

A meta-framework that allows defining UI components declaratively in YAML/JSON and compiling them to native, idiomatic code for React, Vue, Angular, Svelte, Web Components, and vanilla JS/TS — with Tailwind CSS integrated at build-time.

**Tagline:** "Write once in YAML. Ship everywhere in native code."

## Organization

- **GitHub Org:** [github.com/declare-ui](https://github.com/declare-ui)
- **This repo (`core`):** Parser, AST, validators, and multi-target code generators
- **Sibling repos:** `cli`, `mcp`, `tailwind-plugin`, `components`, `vscode`, `playground`, `docs`, `create-declareui`, `examples`
- **npm scope:** `@declareui/core`
- **Website:** [declare-ui.github.io](https://declare-ui.github.io)

## Architecture

```
YAML/JSON Source → Parser (js-yaml) → Schema Validator (zod) → ComponentAST → Target Generators → Output
                                                                     ↓
                                                              Tailwind Pipeline
                                                          (class extraction → JIT → CSS per target)
```

### Core Pipeline (4 phases)

1. **Parse**: YAML/JSON → Raw Object (js-yaml)
2. **Validate**: Raw Object → ComponentAST (zod schemas)
3. **Optimize**: Tree-shake Tailwind classes, dead code elimination, expression dependency analysis
4. **Generate**: ComponentAST → target-specific code (one Generator per target)

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | TypeScript (strict) | Type safety, DX |
| Parser | `js-yaml` | Mature, fast, typed |
| Validation | `zod` | Runtime validation + type inference |
| AST | Custom TypeScript interfaces | Full control over IR |
| Code Generation | Template strings + AST manipulation | Flexible, debuggable |
| Tailwind | `@tailwindcss/node` (JIT API) | Official integration |
| Testing | `vitest` | Fast, ESM-native |
| Bundling | `rollup` or `tsup` | Tree-shakeable output |

## Component Schema Specification (`.ui.yaml`)

### File naming
Components use the `.ui.yaml` extension: `button.ui.yaml`, `data-table.ui.yaml`

### Top-level fields

```yaml
component: PascalCaseName     # required
version: "1.0.0"              # semver
description: "..."            # optional

props: { ... }                # public API
state: { ... }                # internal reactive state
events: { ... }               # emitted events
slots: { ... }                # composition slots
template: { ... }             # UI structure + Tailwind classes
lifecycle: { ... }            # onMount, onUnmount hooks
tests: [ ... ]                # declarative test cases
imports: [ ... ]              # logic module imports (for complex logic)
computed: { ... }             # derived values
```

### Prop types

| Type | YAML | Generated TypeScript |
|------|------|---------------------|
| `string` | `type: string` | `string` |
| `number` | `type: number` | `number` |
| `boolean` | `type: boolean` | `boolean` |
| `enum` | `type: enum, values: [...]` | `'a' \| 'b' \| 'c'` |
| `object` | `type: object, shape: {...}` | Generated interface |
| `array` | `type: array, items: {...}` | `T[]` |
| `function` | `type: function, signature: {...}` | `(...args) => ReturnType` |

### Expression syntax ($-prefixed)

| Expression | Description |
|-----------|-------------|
| `$props.x` | Access prop value |
| `$state.x` | Access internal state |
| `$emit(name, payload)` | Emit event |
| `$event` | DOM event reference |
| `$slots.x` | Check if slot has content |
| `$refs.x` | Element reference |
| `$use(fn, ...args)` | Call imported logic module function |
| `$computed.x` | Access computed value |

Expressions support: property access, ternary/logical operators, `$emit`/`$refs` calls, `$state` assignment. Expressions do NOT support: imports, `window`/`document` access, async/await, loops.

### Template structure

```yaml
template:
  tag: button                    # HTML tag
  attrs:                         # HTML attributes (can use expressions)
    type: button
    disabled: "$props.disabled"
  classes:
    base: "px-4 py-2 rounded"   # always applied
    variants:                    # applied based on prop values
      variant:
        primary: "bg-blue-600 text-white"
        secondary: "bg-gray-100"
    conditionals:                # applied when condition is true
      - when: "$props.disabled"
        add: "opacity-50 cursor-not-allowed"
  on:                            # event handlers (expressions)
    click: "$emit('click', { originalEvent: $event })"
  children:                      # child nodes
    - tag: span
      content: "$props.label"    # text content (expression)
    - when: "$props.loading"     # conditional rendering
      tag: span
      classes: "animate-spin"
    - slot: default              # slot reference
```

### Declarative tests

```yaml
tests:
  - name: "renders with label"
    props: { label: "Click me" }
    assert:
      - selector: "button"
        textContent: "Click me"
        hasClass: "bg-blue-600"
  - name: "emits click"
    props: { label: "Test" }
    simulate: { event: "click" }
    assert:
      - eventEmitted: "click"
        times: 1
```

## ComponentAST (Internal Representation)

```typescript
interface ComponentAST {
  meta: { name: string; version: string; description?: string };
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

interface TemplateNode {
  tag: string;
  attrs: Record<string, string | Expression>;
  classes: ClassDefinition;
  on: Record<string, Expression>;
  children: (TemplateNode | SlotReference | ConditionalNode | TextNode)[];
  ref?: string;
}

interface Expression {
  raw: string;
  dependencies: string[];  // ['props.variant', 'state.isOpen']
  pure: boolean;
}

interface ClassDefinition {
  base: string;
  variants?: Record<string, Record<string, string>>;
  conditionals?: Array<{ when: string; add: string; remove?: string }>;
}
```

## Target Generators

Each generator transforms ComponentAST into idiomatic framework code:

| Target | Generator | Output |
|--------|-----------|--------|
| React | `ReactGenerator` | `.tsx` with hooks, forwardRef, cn() utility |
| Vue | `VueGenerator` | `.vue` SFC with Composition API, `<script setup>` |
| Svelte | `SvelteGenerator` | `.svelte` with runes syntax (Svelte 5) |
| Angular | `AngularGenerator` | `.component.ts` standalone, OnPush change detection |
| Web Components | `WCGenerator` | `.ts` Custom Element, Shadow DOM, adoptedStyleSheets |
| Vanilla | `VanillaGenerator` | `.ts` class-based, no framework dependencies |

**Important:** Output must be native and idiomatic. React output should look like a React dev wrote it. Vue output uses Composition API. NOT wrappers around Web Components.

## Directory Structure

```
src/
├── index.ts                    # public API exports
├── parser/
│   ├── index.ts                # parseComponent(yaml: string): RawComponent
│   └── yaml-parser.ts          # js-yaml wrapper
├── validator/
│   ├── index.ts                # validateComponent(raw: RawComponent): ComponentAST
│   ├── schema.ts               # zod schemas for all component fields
│   └── expression-parser.ts    # parse $-expressions, extract dependencies
├── ast/
│   ├── types.ts                # ComponentAST, TemplateNode, Expression, etc.
│   └── optimizer.ts            # tree-shake, dead code elimination
├── generators/
│   ├── base.ts                 # abstract BaseGenerator class
│   ├── react.ts                # ReactGenerator
│   ├── vue.ts                  # VueGenerator
│   ├── svelte.ts               # SvelteGenerator
│   ├── angular.ts              # AngularGenerator
│   ├── wc.ts                   # WCGenerator (Web Components)
│   └── vanilla.ts              # VanillaGenerator
├── tailwind/
│   ├── extractor.ts            # extract all Tailwind classes from AST
│   └── builder.ts              # generate CSS per target via Tailwind JIT
└── utils/
    ├── cn.ts                   # class name merging utility (shipped with output)
    └── codegen.ts              # code generation helpers (indent, template literals)
```

## Conventions

- **File naming:** kebab-case for files, PascalCase for classes/types, camelCase for functions
- **Exports:** barrel exports from each directory's `index.ts`
- **Error handling:** Custom error classes extending `DeclareUIError` with code, message, location
- **Testing:** colocated test files (`*.test.ts`) next to source files
- **Prefix:** `dui-` for Web Component custom elements (configurable)

## Development Priorities (Current Phase)

### Phase 1 — Foundation (CURRENT)
1. Define zod schemas for `.ui.yaml` validation
2. Implement parser (YAML → RawComponent)
3. Implement validator (RawComponent → ComponentAST)
4. Implement expression parser ($-syntax → dependency graph)
5. Implement ReactGenerator (first target, largest user base)
6. Implement WCGenerator (universal foundation)
7. Tailwind class extraction from AST
8. Unit tests for parser, validator, and generators

### Phase 2 — Multi-Framework
9. VueGenerator
10. SvelteGenerator
11. TypeScript declaration generation
12. Declarative test compiler (YAML tests → vitest)

### Phase 3 — Completude
13. AngularGenerator
14. VanillaGenerator
15. Tailwind JIT integration (build-time CSS)
16. Optimizer (tree-shaking, dead code elimination)

## Key ADRs (Architecture Decision Records)

1. **YAML as primary format** — Readable, supports comments and multi-line strings. JSON as 1:1 convertible alternative.
2. **Native bindings, not wrappers** — React output is real React, not a Web Component wrapper. Better DX, no overhead.
3. **Tailwind build-time default** — Zero runtime overhead in production. Runtime (Twind) only for dev/prototyping.
4. **Limited expressions, not Turing-complete** — YAML stays declarative. Complex logic goes in TypeScript "logic modules" imported via `$use()`.
5. **Tests in YAML compiled to vitest** — Single source of truth, test all targets with same assertions.

## Reference: Complete Button Example

```yaml
component: Button
version: "1.0.0"
description: "Reusable button with variants and states"

props:
  variant:
    type: enum
    values: [primary, secondary, ghost, danger]
    default: primary
  size:
    type: enum
    values: [sm, md, lg]
    default: md
  disabled:
    type: boolean
    default: false
  loading:
    type: boolean
    default: false
  label:
    type: string
    required: true
  fullWidth:
    type: boolean
    default: false

state:
  isPressed:
    type: boolean
    initial: false

events:
  click:
    payload:
      originalEvent: MouseEvent

template:
  tag: button
  attrs:
    type: button
    disabled: "$props.disabled || $props.loading"
    aria-busy: "$props.loading"
    aria-label: "$props.label"
  classes:
    base: "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer"
    variants:
      variant:
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300"
        ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400"
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
      size:
        sm: "text-sm px-3 py-1.5 gap-1.5"
        md: "text-base px-4 py-2 gap-2"
        lg: "text-lg px-6 py-3 gap-2.5"
    conditionals:
      - when: "$props.disabled"
        add: "opacity-50 cursor-not-allowed"
      - when: "$props.fullWidth"
        add: "w-full"
      - when: "$state.isPressed && !$props.disabled"
        add: "scale-95"
  on:
    click: |
      if (!$props.disabled && !$props.loading) {
        $emit('click', { originalEvent: $event });
      }
    mousedown: "$state.isPressed = true"
    mouseup: "$state.isPressed = false"
  children:
    - when: "$props.loading"
      tag: span
      classes: "animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"
      attrs:
        aria-hidden: "true"
    - tag: span
      content: "$props.label"

slots:
  default:
    description: "Custom content replaces label"
    fallback: "$props.label"

tests:
  - name: "renders with label"
    props: { label: "Click me", variant: "primary" }
    assert:
      - selector: "button"
        textContent: "Click me"
      - selector: "button"
        hasClass: "bg-blue-600"
  - name: "does not emit click when disabled"
    props: { label: "Disabled", disabled: true }
    simulate: { event: "click" }
    assert:
      - eventEmitted: "click"
        times: 0
  - name: "shows spinner when loading"
    props: { label: "Loading", loading: true }
    assert:
      - selector: "span.animate-spin"
        exists: true
```
