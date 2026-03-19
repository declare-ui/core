/**
 * Code generation helper utilities.
 */

/**
 * Indent a block of code by a given level.
 *
 * @param code - The code string to indent
 * @param level - Number of indent levels (each level = 2 spaces)
 * @returns Indented code string
 */
export function indent(code: string, level: number): string {
  const spaces = '  '.repeat(level);
  return code
    .split('\n')
    .map((line) => (line.trim() ? `${spaces}${line}` : line))
    .join('\n');
}

/**
 * Wrap a string in single quotes.
 */
export function wrapInQuotes(s: string): string {
  return `'${s.replace(/'/g, "\\'")}'`;
}

/**
 * Convert a string to PascalCase.
 */
export function toPascalCase(s: string): string {
  return s
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Convert a string to camelCase.
 */
export function toCamelCase(s: string): string {
  const pascal = toPascalCase(s);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a PascalCase or camelCase string to kebab-case.
 */
export function toKebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Join lines with newlines, filtering out empty ones.
 */
export function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join('\n');
}
