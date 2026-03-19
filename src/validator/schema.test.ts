import { describe, it, expect } from 'vitest';
import { componentSchema } from './schema.js';

const VALID_BUTTON_RAW = {
  component: 'Button',
  version: '1.0.0',
  description: 'Reusable button',
  props: {
    variant: {
      type: 'enum' as const,
      values: ['primary', 'secondary'],
      default: 'primary',
    },
    label: {
      type: 'string' as const,
      required: true,
    },
    disabled: {
      type: 'boolean' as const,
      default: false,
    },
  },
  state: {
    isPressed: {
      type: 'boolean',
      initial: false,
    },
  },
  events: {
    click: {
      payload: { originalEvent: 'MouseEvent' },
    },
  },
  template: {
    tag: 'button',
    attrs: { type: 'button' },
    classes: {
      base: 'px-4 py-2',
      variants: {
        variant: {
          primary: 'bg-blue-600',
          secondary: 'bg-gray-100',
        },
      },
    },
    children: [
      { tag: 'span', content: '$props.label' },
    ],
  },
  slots: {
    default: { description: 'Default content' },
  },
  tests: [
    {
      name: 'renders with label',
      props: { label: 'Click me' },
      assert: [{ selector: 'button', textContent: 'Click me' }],
    },
  ],
};

describe('Component Schema', () => {
  it('validates a complete Button raw object', () => {
    const result = componentSchema.safeParse(VALID_BUTTON_RAW);
    expect(result.success).toBe(true);
  });

  it('fails when component field is missing', () => {
    const { component: _, ...withoutComponent } = VALID_BUTTON_RAW;
    const result = componentSchema.safeParse(withoutComponent);
    expect(result.success).toBe(false);
  });

  it('fails when component field is empty', () => {
    const result = componentSchema.safeParse({ ...VALID_BUTTON_RAW, component: '' });
    expect(result.success).toBe(false);
  });

  it('fails with invalid prop type', () => {
    const result = componentSchema.safeParse({
      ...VALID_BUTTON_RAW,
      props: {
        bad: { type: 'invalid_type' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('fails when enum prop has no values', () => {
    const result = componentSchema.safeParse({
      ...VALID_BUTTON_RAW,
      props: {
        variant: { type: 'enum' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('applies defaults for missing optional fields', () => {
    const minimal = {
      component: 'Minimal',
      template: { tag: 'div' },
    };
    const result = componentSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe('1.0.0');
      expect(result.data.props).toEqual({});
      expect(result.data.state).toEqual({});
      expect(result.data.events).toEqual({});
      expect(result.data.tests).toEqual([]);
    }
  });
});
