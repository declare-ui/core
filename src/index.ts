/**
 * @declareuihq/core — DeclareUI engine public API.
 *
 * Parse, validate, and generate UI components from YAML definitions.
 */

export { parseComponent, parseComponentFile } from './parser/index.js';
export { validateComponent } from './validator/index.js';
export { extractClasses } from './tailwind/extractor.js';
export { ReactGenerator } from './generators/react.js';
export { WCGenerator } from './generators/wc.js';
export { BaseGenerator } from './generators/base.js';
export * from './ast/types.js';
export * from './errors.js';
