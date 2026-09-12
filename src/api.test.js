import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVerdict } from './api.js';

// Product P4 (Battle Card): the share card reuses compareVerdict's winner
// and text as-is — no new AI call, no new comparison logic. These tests
// protect the exact data the card is built from.

test('compareVerdict picks A as the winner when A scores higher', () => {
  const verdict = compareVerdict({ puan: 91 }, { puan: 78 });
  assert.equal(verdict.winner, 'A');
  assert.match(verdict.text, /A/);
});

test('compareVerdict picks B as the winner when B scores higher', () => {
  const verdict = compareVerdict({ puan: 78 }, { puan: 91 });
  assert.equal(verdict.winner, 'B');
  assert.match(verdict.text, /B/);
});

test('compareVerdict reports no winner on a tie, with honest tie text', () => {
  const verdict = compareVerdict({ puan: 80 }, { puan: 80 });
  assert.equal(verdict.winner, null);
  assert.match(verdict.text, /Başa baş/);
});
