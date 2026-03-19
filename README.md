<p align="left">
    <img width="1280" height="192" alt="wordmark-color-transparent-1280x192" src="https://github.com/user-attachments/assets/d51c038f-7822-4ee4-beb8-f438894f7736" />
    <img width="1280" height="192" alt="wordmark-color-transparent-1280x192" src="https://github.com/user-attachments/assets/d51c038f-7822-4ee4-beb8-f438894f7736" />
</p>

# @declareui/core

The engine behind DeclareUI — parser, schema validator, AST, and multi-target code generators.

---

## What it does

`@declareui/core` takes `.ui.yaml` (or `.ui.json`) component declarations and compiles them into native, idiomatic code for any supported framework:

- **React** — functional components with hooks, proper JSX
- **Vue** — Composition API with `<script setup>`
- **Angular** — standalone components with signals
- **Svelte** — runes-based `.svelte` files
- **Web Components** — Custom Elements with Shadow DOM
- **Vanilla JS/TS** — framework-free, zero dependencies

## Installation

```bash
pnpm add @declareui/core
```

## Usage

```typescript
import { parse, validate, generate } from '@declareui/core';

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
| [`@declareui/cli`](https://github.com/declare-ui/cli) | CLI tool for building and managing components |
| [`@declareui/mcp`](https://github.com/declare-ui/mcp) | MCP server for AI-driven component development |
| [`@declareui/components`](https://github.com/declare-ui/components) | Pre-built component library |
| [`@declareui/tailwind-plugin`](https://github.com/declare-ui/tailwind-plugin) | Tailwind CSS integration |

## Contributing

See [CONTRIBUTING.md](https://github.com/declare-ui/.github/blob/main/CONTRIBUTING.md) for guidelines.

## License

MIT
