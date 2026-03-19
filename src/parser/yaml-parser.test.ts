import { describe, it, expect } from 'vitest';
import { parseComponent } from './yaml-parser.js';
import { DeclareUIParseError } from '../errors.js';

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
`;

describe('YAML Parser', () => {
  it('parses valid Button YAML with correct structure', () => {
    const result = parseComponent(BUTTON_YAML);

    expect(result.component).toBe('Button');
    expect(result.version).toBe('1.0.0');
    expect(result.description).toBe('Reusable button with variants and states');

    // Props
    expect(result.props).toBeDefined();
    const props = result.props as Record<string, unknown>;
    expect(props.variant).toBeDefined();
    expect(props.label).toBeDefined();

    // State
    expect(result.state).toBeDefined();

    // Events
    expect(result.events).toBeDefined();

    // Template
    expect(result.template).toBeDefined();
    const template = result.template as Record<string, unknown>;
    expect(template.tag).toBe('button');

    // Tests
    expect(result.tests).toBeDefined();
    expect(Array.isArray(result.tests)).toBe(true);
  });

  it('throws DeclareUIParseError on invalid YAML', () => {
    const invalidYaml = `
component: Test
  invalid: indentation
    broken: true
  : missing key
`;
    expect(() => parseComponent(invalidYaml)).toThrow(DeclareUIParseError);
  });

  it('throws DeclareUIParseError on non-object YAML', () => {
    expect(() => parseComponent('just a string')).toThrow(DeclareUIParseError);
    expect(() => parseComponent('42')).toThrow(DeclareUIParseError);
  });
});
