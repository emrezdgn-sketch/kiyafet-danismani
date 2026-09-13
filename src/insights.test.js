import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageScore, maxScore, scoreTrend } from './insights.js';

function entry(score, overrides = {}) {
  return { id: `${Math.random()}`, score, blurb: '', thumb: null, ...overrides };
}

// --- averageScore ---

test('averageScore rounds the mean of the stored scores', () => {
  assert.equal(averageScore([entry(70), entry(80), entry(90)]), 80);
  assert.equal(averageScore([entry(70), entry(71)]), 71); // 70.5 rounds up
});

test('averageScore returns null for empty history', () => {
  assert.equal(averageScore([]), null);
});

test('averageScore ignores malformed entries instead of throwing', () => {
  assert.equal(averageScore([entry(80), { id: 'x' }, entry(60), null, undefined]), 70);
});

// --- maxScore ---

test('maxScore returns the highest stored score', () => {
  assert.equal(maxScore([entry(72), entry(91), entry(58)]), 91);
});

test('maxScore returns null for empty history', () => {
  assert.equal(maxScore([]), null);
});

test('maxScore ignores malformed entries instead of throwing', () => {
  assert.equal(maxScore([entry(65), { score: 'not-a-number' }, entry(70)]), 70);
});

// --- scoreTrend ---

test('scoreTrend returns null when there is not enough data (fewer than 4 entries)', () => {
  assert.equal(scoreTrend([]), null);
  assert.equal(scoreTrend([entry(80)]), null);
  assert.equal(scoreTrend([entry(80), entry(70), entry(60)]), null);
});

test('scoreTrend classifies an upward trend (newest-first history)', () => {
  // newest-first: [90, 88] recent vs [60, 62] older
  const trend = scoreTrend([entry(90), entry(88), entry(60), entry(62)]);
  assert.equal(trend.direction, 'up');
  assert.ok(trend.diff > 0);
});

test('scoreTrend classifies a downward trend without forcing positive framing', () => {
  const trend = scoreTrend([entry(60), entry(62), entry(90), entry(88)]);
  assert.equal(trend.direction, 'down');
  assert.ok(trend.diff < 0);
});

test('scoreTrend classifies a flat trend', () => {
  const trend = scoreTrend([entry(75), entry(75), entry(75), entry(75)]);
  assert.equal(trend.direction, 'flat');
  assert.equal(trend.diff, 0);
});

// --- backward/forward compatibility: entries missing fields never crash ---

test('all three helpers fail safely on a non-array or malformed history value', () => {
  assert.equal(averageScore(null), null);
  assert.equal(averageScore(undefined), null);
  assert.equal(maxScore('not-an-array'), null);
  assert.equal(scoreTrend({}), null);
});

test('helpers tolerate legacy-shaped entries missing blurb/thumb fields', () => {
  const legacyEntries = [{ id: '1', score: 80 }, { id: '2', score: 70 }, { id: '3', score: 60 }, { id: '4', score: 90 }];
  assert.equal(averageScore(legacyEntries), 75);
  assert.equal(maxScore(legacyEntries), 90);
  assert.doesNotThrow(() => scoreTrend(legacyEntries));
});
