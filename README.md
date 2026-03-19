<p align="left">
    <img width="1280" height="192" alt="DeclareUI" src="https://github.com/user-attachments/assets/d51c038f-7822-4ee4-beb8-f438894f7736#gh-light-mode-only" />
    <img width="1280" height="192" alt="DeclareUI" src="https://github.com/user-attachments/assets/44918531-3b1b-4ace-bca0-db0ea99f8bc8#gh-dark-mode-only" />
</p>

# @declareuihq/core

The engine behind DeclareUI — parser, schema validator, AST, and multi-target code generators.

---

## What it does

`@declareuihq/core` takes `.ui.yaml` (or `.ui.json`) component declarations and compiles them into native, idiomatic code for any supported framework:

- **React** — functional components with hooks, proper JSX
- **Vue** — Composition API with `<script setup>`
- **Angular** — standalone components with signals
- **Svelte** — runes-based `.svelte` files
- **Web Components** — Custom Elements with Shadow DOM
- **Vanilla JS/TS** — framework-free, zero dependencies

## Installation

```bash
pnpm add @declareuihq/core
```

## Usage

```typescript
import { parse, validate, generate } from '@declareuihq/core';

// Parse a .ui.yaml file into AST
const ast = parse('button.ui.yaml');

// Validate against the DeclareUI schema
const result = validate(ast);

// Generate native code for target frameworks
const output = generate(ast, {
  targets: ['react', 'vue', 'svelte'],
  typescript: true,
});
```

## Architecture

```
.ui.yaml → Parser → AST → Validator → Code Generator → Native Code
                                              ↓
                                    React | Vue | Angular | Svelte | WC | Vanilla
```

## Related packages

| Package | Description |
|:--------|:------------|
| [`@declareuihq/cli`](https://github.com/declare-ui/cli) | CLI tool for building and managing components |
| [`@declareuihq/mcp`](https://github.com/declare-ui/mcp) | MCP server for AI-driven component development |
| [`@declareuihq/components`](https://github.com/declare-ui/components) | Pre-built component library |
| [`@declareuihq/tailwind-plugin`](https://github.com/declare-ui/tailwind-plugin) | Tailwind CSS integration |

## Contributing

See [CONTRIBUTING.md](https://github.com/declare-ui/.github/blob/main/CONTRIBUTING.md) for guidelines.

## License

MIT
