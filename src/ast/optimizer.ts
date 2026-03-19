/**
 * AST optimizer — tree-shaking, dead code elimination.
 *
 * Placeholder for Phase 3. Currently passes through unchanged.
 */

import type { ComponentAST } from './types.js';

/**
 * Optimize a ComponentAST (currently a no-op pass-through).
 *
 * @param ast - The component AST to optimize
 * @returns Optimized AST
 */
export function optimize(ast: ComponentAST): ComponentAST {
  // Phase 3: implement tree-shaking and dead code elimination
  return ast;
}
