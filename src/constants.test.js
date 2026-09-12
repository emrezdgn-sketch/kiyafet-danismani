import { test } from 'node:test';
import assert from 'node:assert/strict';
import { improvementDelta } from './constants.js';

test('improvementDelta reports a positive improvement state', () => {
  const result = improvementDelta(72, 86);
  assert.deepEqual(result, { before: 72, after: 86, delta: 14, state: 'positive' });
});

test('improvementDelta reports a neutral state on zero delta', () => {
  const result = improvementDelta(72, 72);
  assert.deepEqual(result, { before: 72, after: 72, delta: 0, state: 'neutral' });
});

test('improvementDelta reports an honest negative state without forcing improved language', () => {
  const result = improvementDelta(80, 65);
  assert.deepEqual(result, { before: 80, after: 65, delta: -15, state: 'negative' });
});

test('improvementDelta never recalculates or adjusts either canonical score, only their difference', () => {
  const before = 58;
  const after = 91;
  const result = improvementDelta(before, after);
  // The function must return the inputs verbatim (rounded), not values it
  // derived from anything else — before/after come straight from two
  // separate canonical Worker responses.
  assert.equal(result.before, before);
  assert.equal(result.after, after);
  assert.equal(result.delta, after - before);
});

test('improvementDelta is pure: consecutive calls with different inputs never leak state between them', () => {
  const first = improvementDelta(72, 86);
  const second = improvementDelta(10, 10);
  const third = improvementDelta(72, 86);
  assert.deepEqual(first, third);
  assert.notDeepEqual(first, second);
  assert.equal(second.state, 'neutral');
});
