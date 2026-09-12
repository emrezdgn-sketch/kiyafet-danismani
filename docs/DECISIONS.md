# Architecture Decisions — Nasıl Olmuşum AI

## 2026-09-12 — Phase 4.1: API contract authority boundary

**Rule:** The Cloudflare Worker (`proxy/worker.js`) is the canonical authority
for Anthropic request construction, AI response parsing, validation,
normalization, and final score calculation. The frontend (`src/`) performs
defensive validation only — it decides whether a response is safe enough to
render, never what the score or content should be.

**Why:** Phase 4 introduced response validation and weighted-score
recalculation, but placed all of it client-side (`src/validate.js`). The
Worker only forwarded Anthropic's raw response envelope unmodified. This
meant the browser — not the server — was the real authority on the
application's official score, and any client could bypass or alter that
logic before it reached the user.

**What changed:**

- `proxy/worker.js` now owns `extractJSON()` (strips markdown fences, parses
  the model's JSON) and `validateAndNormalize()` (structural + semantic
  validation, per-criterion score clamping, canonical weighted-score
  recalculation, deviation correction, defaults for `guven`/`oneriler`).
  `CRITERIA_WEIGHTS` in the Worker is the single source of truth for the
  scoring formula.
- The Worker's HTTP response is now the canonical application DTO
  (`{ genel_izlenim, puan, kriterler, guven, oneriler }`) on success, or
  `{ error: { message } }` on failure — never Anthropic's raw envelope
  (`content[]`, `stop_reason`, etc.).
- `src/api.js` no longer parses or normalizes anything; it sends the
  request and passes the Worker's DTO straight through after a safety check.
- `src/validate.js` was rewritten from an authoritative normalizer into
  `assertSafeResponse()` — a defensive check that rejects a malformed
  response before it reaches the UI, without recomputing or correcting any
  value.
- `src/constants.js` keeps its own `CRITERIA` array with weights, but those
  are used only for the UI label ("Ağırlık %30") and icon in
  `CriterionRow` — never for a calculation. If the Worker's
  `CRITERIA_WEIGHTS` ever changes, this display copy must be updated to
  match (flagged, not automated, since sharing ~10 lines of constants
  across the Worker and Vite build isn't worth the added build complexity).

**Tests:** `proxy/worker.test.js` and `src/validate.test.js`, run via
`npm test` (Node's built-in test runner — no new dependency).
