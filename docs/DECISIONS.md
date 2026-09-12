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

## 2026-09-12 — Phase 4.2: Canonical score & contract lock

**Rule:** The official `puan` is *always* the weighted sum of validated
criterion scores under the Worker's `CRITERIA_WEIGHTS` formula. The model's
own top-level `puan` field is never read as part of the canonical score —
not "kept if close enough," not read at all. Every successful canonical
response also carries an explicit `version: 1`.

**Why:** Phase 4.1 fixed *where* validation happened but kept a tolerance
rule from Phase 4 — the model's stated total was kept unless it deviated
from the recalculated value by more than 3 points. That made the official
score not strictly reproducible from `kriterler` alone, which upcoming
product flows require exactly: Before/After deltas, A/B comparison,
historical score tracking, and share cards showing score deltas all need
`puan` to be a pure, deterministic function of the criterion scores — never
a value the model could nudge.

**What changed:**

- `proxy/worker.js`: `validateAndNormalize()` no longer reads, validates, or
  compares against `raw.puan` at all. The canonical `puan` is computed
  solely from `kriterler` (after per-criterion clamping) and
  `CRITERIA_WEIGHTS`. Removed `SCORE_TOLERANCE` and the deviation-correction
  branch — there is nothing left to tolerate.
- Added `CONTRACT_VERSION = 1`; every successful response now includes
  `version: 1` alongside the existing Turkish field names (no fields
  renamed).
- `src/validate.js`: `assertSafeResponse()` now rejects any response whose
  `version` isn't the frontend's `SUPPORTED_CONTRACT_VERSION` (currently
  `1`), so an incompatible future contract fails safely instead of
  rendering partially-understood data. Still defensive-only — no score
  computation.
- The model's system prompt still asks for a top-level `puan` (prompt
  unchanged, per approval gates); it's simply never consumed. This also
  makes the app resilient to the model someday omitting it.

**Tests:** `proxy/worker.test.js` proves the canonical score is identical
regardless of what the model claims (±1, ±3, or wildly off), even when
`puan` is missing or non-numeric entirely, and that a clamped criterion
value feeds the recalculation. `src/validate.test.js` proves the frontend
accepts `version: 1`, rejects a missing/unsupported version, and never
computes or mutates the score itself.
