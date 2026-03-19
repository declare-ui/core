import { describe, it, expect } from 'vitest';
import { parseComponent } from '../parser/yaml-parser.js';
import { validateComponent } from './index.js';
import { DeclareUIValidationError } from '../errors.js';

const BUTTON_YAML = `
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
`;

describe('Validator', () => {
  it('validates full Button YAML into ComponentAST', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);

    expect(ast.meta.name).toBe('Button');
    expect(ast.meta.version).toBe('1.0.0');
    expect(ast.meta.description).toBe('Reusable button with variants and states');
  });

  it('produces correct prop definitions', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);

    expect(ast.props).toHaveLength(6);

    const variant = ast.props.find((p) => p.name === 'variant');
    expect(variant?.type).toBe('enum');
    expect(variant?.values).toEqual(['primary', 'secondary', 'ghost', 'danger']);
    expect(variant?.default).toBe('primary');

    const label = ast.props.find((p) => p.name === 'label');
    expect(label?.type).toBe('string');
    expect(label?.required).toBe(true);
  });

  it('produces correct state definitions', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);

    expect(ast.state).toHaveLength(1);
    expect(ast.state[0].name).toBe('isPressed');
    expect(ast.state[0].type).toBe('boolean');
    expect(ast.state[0].initial).toBe(false);
  });

  it('produces correct event definitions', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);

    expect(ast.events).toHaveLength(1);
    expect(ast.events[0].name).toBe('click');
    expect(ast.events[0].payload).toEqual({ originalEvent: 'MouseEvent' });
  });

  it('parses expressions in template attrs', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);

    const disabledAttr = ast.template.attrs.disabled;
    expect(typeof disabledAttr).not.toBe('string');
    if (typeof disabledAttr !== 'string') {
      expect(disabledAttr.raw).toBe('$props.disabled || $props.loading');
      expect(disabledAttr.dependencies).toContain('props.disabled');
      expect(disabledAttr.dependencies).toContain('props.loading');
    }
  });

  it('parses expressions in event handlers', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);

    const clickHandler = ast.template.on.click;
    expect(clickHandler).toBeDefined();
    expect(clickHandler.pure).toBe(false);
  });

  it('builds template children correctly', () => {
    const raw = parseComponent(BUTTON_YAML);
    const ast = validateComponent(raw);

    expect(ast.template.children).toHaveLength(2);

    // First child is conditional (loading spinner)
    const spinner = ast.template.children[0];
    expect('type' in spinner && spinner.type).toBe('conditional');

    // Second child is a regular template node (label span)
    const labelSpan = ast.template.children[1];
    expect('tag' in labelSpan && labelSpan.tag).toBe('span');
  });

  it('throws DeclareUIValidationError for invalid input', () => {
    expect(() => validateComponent({ template: { tag: 'div' } })).toThrow(
      DeclareUIValidationError,
    );
  });

  it('throws DeclareUIValidationError when component name is missing', () => {
    expect(() =>
      validateComponent({ template: { tag: 'div' } }),
    ).toThrow(DeclareUIValidationError);
  });
});
