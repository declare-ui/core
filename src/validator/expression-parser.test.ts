import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser.js';

describe('Expression Parser', () => {
  it('parses $props.variant as pure with correct dependencies', () => {
    const expr = parseExpression('$props.variant');
    expect(expr.dependencies).toEqual(['props.variant']);
    expect(expr.pure).toBe(true);
  });

  it('parses $state.isPressed = true as impure', () => {
    const expr = parseExpression('$state.isPressed = true');
    expect(expr.dependencies).toEqual([]);
    expect(expr.pure).toBe(false);
  });

  it('parses $emit call as impure with no dependencies', () => {
    const expr = parseExpression("$emit('click', { originalEvent: $event })");
    expect(expr.dependencies).toEqual([]);
    expect(expr.pure).toBe(false);
  });

  it('parses complex expression with multiple dependencies', () => {
    const expr = parseExpression('$props.disabled || $props.loading');
    expect(expr.dependencies).toEqual(['props.disabled', 'props.loading']);
    expect(expr.pure).toBe(true);
  });

  it('parses mixed state and prop references', () => {
    const expr = parseExpression('$state.isPressed && !$props.disabled');
    expect(expr.dependencies).toEqual(['props.disabled', 'state.isPressed']);
    expect(expr.pure).toBe(true);
  });

  it('preserves raw expression string', () => {
    const raw = '$props.variant === "primary" ? "active" : ""';
    const expr = parseExpression(raw);
    expect(expr.raw).toBe(raw);
  });

  it('handles expression with emit in multi-line handler', () => {
    const raw = `if (!$props.disabled && !$props.loading) {
  $emit('click', { originalEvent: $event });
}`;
    const expr = parseExpression(raw);
    expect(expr.pure).toBe(false);
    expect(expr.dependencies).toContain('props.disabled');
    expect(expr.dependencies).toContain('props.loading');
  });
});
