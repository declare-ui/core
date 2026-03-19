/**
 * Expression parser for DeclareUI $-prefixed expressions.
 *
 * Extracts metadata (dependencies, purity) without executing the expression.
 */

import type { Expression } from '../ast/types.js';

/**
 * Parse a raw expression string into an Expression with metadata.
 *
 * @param raw - The raw expression string (e.g. "$props.variant")
 * @returns Parsed Expression with dependencies and purity info
 */
export function parseExpression(raw: string): Expression {
  const dependencies = extractDependencies(raw);
  const pure = detectPurity(raw);

  return { raw, dependencies, pure };
}

/**
 * Extract dependencies from an expression.
 * Matches `$props.x` and `$state.x` references.
 */
function extractDependencies(raw: string): string[] {
  const deps = new Set<string>();

  // Match $props.propName and $state.stateName
  const propMatches = raw.matchAll(/\$props\.(\w+)/g);
  for (const match of propMatches) {
    deps.add(`props.${match[1]}`);
  }

  const stateMatches = raw.matchAll(/\$state\.(\w+)/g);
  for (const match of stateMatches) {
    // Exclude state assignments from dependencies (only reads)
    // Check if this particular match is an assignment target
    const beforeMatch = raw.substring(0, match.index);
    const afterMatch = raw.substring(match.index! + match[0].length);
    // If followed by ` = ` (assignment), it's a write, not a read dependency
    if (!/^\s*=[^=]/.test(afterMatch)) {
      deps.add(`state.${match[1]}`);
    }
  }

  return Array.from(deps).sort();
}

/**
 * Detect if an expression is pure (no side effects).
 * Expressions with $emit or $state assignment are impure.
 */
function detectPurity(raw: string): boolean {
  // $emit calls are side effects
  if (/\$emit\s*\(/.test(raw)) {
    return false;
  }

  // $state.x = value is a state mutation
  if (/\$state\.\w+\s*=[^=]/.test(raw)) {
    return false;
  }

  return true;
}
