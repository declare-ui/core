import { describe, it, expect } from 'vitest';
import { parseComponent } from '../parser/yaml-parser.js';
import { validateComponent } from '../validator/index.js';
import { extractClasses } from './extractor.js';

const BUTTON_YAML = `
component: Button
version: "1.0.0"

props:
  variant:
    type: enum
    values: [primary, secondary]
    default: primary
  disabled:
    type: boolean
    default: false
  loading:
    type: boolean
    default: false
  fullWidth:
    type: boolean
    default: false
  label:
    type: string
    required: true

state:
  isPressed:
    type: boolean
    initial: false

template:
  tag: button
  classes:
    base: "inline-flex items-center justify-center font-medium rounded-lg"
    variants:
      variant:
        primary: "bg-blue-600 text-white"
        secondary: "bg-gray-100 text-gray-900"
    conditionals:
      - when: "$props.disabled"
        add: "opacity-50 cursor-not-allowed"
      - when: "$props.fullWidth"
        add: "w-full"
      - when: "$state.isPressed && !$props.disabled"
        add: "scale-95"
  children:
    - when: "$props.loading"
      tag: span
      classes: "animate-spin h-4 w-4"
    - tag: span
      content: "$props.label"
`;

describe('Tailwind Extractor', () => {
  it('extracts all classes from Button AST', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);
    const classes = extractClasses(ast);

    // Base classes
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('font-medium');
    expect(classes).toContain('rounded-lg');

    // Variant classes
    expect(classes).toContain('bg-blue-600');
    expect(classes).toContain('text-white');
    expect(classes).toContain('bg-gray-100');
    expect(classes).toContain('text-gray-900');

    // Conditional classes
    expect(classes).toContain('opacity-50');
    expect(classes).toContain('cursor-not-allowed');
    expect(classes).toContain('w-full');
    expect(classes).toContain('scale-95');

    // Child classes
    expect(classes).toContain('animate-spin');
    expect(classes).toContain('h-4');
    expect(classes).toContain('w-4');
  });

  it('returns deduplicated classes', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);
    const classes = extractClasses(ast);

    const uniqueClasses = new Set(classes);
    expect(classes.length).toBe(uniqueClasses.size);
  });
});
