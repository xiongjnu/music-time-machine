const { describe, it } = require('node:test');
const assert = require('node:assert');
const { mergeSlots } = require('../../scripts/core/store');

describe('store — mergeSlots', () => {
  it('adds new slots to existing', () => {
    const existing = { a: { active: [1] } };
    const newSlots = { b: { active: [2] } };
    const merged = mergeSlots(existing, newSlots);
    assert.deepStrictEqual(merged.a, { active: [1] });
    assert.deepStrictEqual(merged.b, { active: [2] });
  });

  it('does not overwrite existing by default', () => {
    const existing = { a: { active: [1, 2, 3] } };
    const newSlots = { a: { active: [9, 9, 9] } };
    const merged = mergeSlots(existing, newSlots);
    assert.deepStrictEqual(merged.a.active, [1, 2, 3]);
  });

  it('overwrites existing when overwrite=true', () => {
    const existing = { a: { active: [1, 2, 3] } };
    const newSlots = { a: { active: [9, 9, 9] } };
    const merged = mergeSlots(existing, newSlots, true);
    assert.deepStrictEqual(merged.a.active, [9, 9, 9]);
  });

  it('fills empty slots (active.length === 0)', () => {
    const existing = { a: { active: [] } };
    const newSlots = { a: { active: [4, 5, 6] } };
    const merged = mergeSlots(existing, newSlots);
    assert.deepStrictEqual(merged.a.active, [4, 5, 6]);
  });

  it('does not mutate the original existing object', () => {
    const existing = { a: { active: [1] } };
    const orig = JSON.stringify(existing);
    mergeSlots(existing, { b: { active: [2] } });
    assert.strictEqual(JSON.stringify(existing), orig);
  });

  it('handles empty objects', () => {
    const merged = mergeSlots({}, {});
    assert.deepStrictEqual(merged, {});
  });

  it('preserves unrelated keys in existing', () => {
    const existing = { a: { active: [1] }, version: 2 };
    const merged = mergeSlots(existing, { b: { active: [2] } });
    assert.strictEqual(merged.version, 2);
  });
});
