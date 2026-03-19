/**
 * The cn() utility source code that gets embedded in generated React output.
 * This is a lightweight clsx-like class name merger.
 */

/**
 * Returns the source code for the cn() utility function.
 * This gets embedded into generated component files.
 */
export function getCnSource(): string {
  return `type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * Merge class names conditionally (clsx-like utility).
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    }
  }
  return classes.join(' ');
}`;
}

/** In-memory cn() for use within the core library itself */
export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}
