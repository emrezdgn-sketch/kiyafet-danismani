// Product P5 — "Stil Yolculuğum". Pure, stateless helpers deriving trends
// from the EXISTING history schema ({id, score, blurb, thumb} —
// src/history.js) only. No criterion or recommendation data is stored per
// entry, so a "strongest recurring criterion" or "most common
// recommendation" insight cannot be safely derived without expanding
// storage — deliberately not attempted this phase (docs/PRODUCT_DECISIONS.md).
//
// history is newest-first (see addHistoryEntry in src/App.jsx: new entries
// are unshifted). All three functions fail safely on empty, malformed, or
// legacy-shaped entries by simply filtering them out rather than throwing.

const MIN_TREND_ENTRIES = 4;

function validScores(history) {
  return (Array.isArray(history) ? history : [])
    .map((h) => Number(h?.score))
    .filter((s) => Number.isFinite(s));
}

export function averageScore(history) {
  const scores = validScores(history);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function maxScore(history) {
  const scores = validScores(history);
  if (!scores.length) return null;
  return Math.max(...scores);
}

// Compares the average of the newer half against the older half. Requires
// at least MIN_TREND_ENTRIES so a 1-2 point wobble never reads as a trend.
export function scoreTrend(history) {
  const scores = validScores(history);
  if (scores.length < MIN_TREND_ENTRIES) return null;
  const half = Math.floor(scores.length / 2);
  const recent = scores.slice(0, half);
  const older = scores.slice(half);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = Math.round(recentAvg - olderAvg);
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  return { direction, diff };
}
