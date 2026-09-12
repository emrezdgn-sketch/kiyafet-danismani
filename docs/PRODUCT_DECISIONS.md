# Product Decisions & Governance — Nasıl Olmuşum AI

> Log of product-level decisions, plus the mandatory template every future
> Product phase must follow. See `docs/DECISIONS.md` for architecture-level
> decisions (this file does not duplicate those — it cross-references them).

## Governance Template (mandatory for every future Product phase)

Every Product phase document from P1 onward must contain, in this order:

1. **OBJECTIVE**
2. **USER PROBLEM**
3. **CURRENT EVIDENCE**
4. **IN SCOPE**
5. **OUT OF SCOPE**
6. **UX CONTRACT** (reference `docs/UX_CONTRACT.md`, don't copy it)
7. **ACCEPTANCE CRITERIA**
8. **REGRESSION MATRIX** (extend `docs/REGRESSION_MATRIX.md`, don't fork it)
9. **APPROVAL GATES**
10. **TEST EVIDENCE**
11. **PASS / PARTIAL / BLOCKED**

Claude may implement approved product decisions. Claude must not
independently make new strategic product decisions.

## Evidence Rules

- Do not mark real-user outcomes PASS based on developer testing.
- No independent real users tested → `REAL_USER_VALIDATION: NOT_TESTED`.
- Sharing not tested on a real target platform → `REAL_SHARE_FLOW: NOT_TESTED`.
- Retention not measured over time → `RETENTION_EVIDENCE: NOT_AVAILABLE`.
- Never invent conversion rates, retention rates, willingness-to-pay, user
  preferences, viral coefficient, or engagement improvements.

## Standing Non-Goals (require explicit approval)

Product work must not introduce, without explicit approval: authentication,
database, social network/feed, wardrobe catalog, affiliate links, payments,
subscription, push notifications, user profiling, storage of original
uploaded photos, face identity recognition, a new AI model, new AI persona
modes, or criterion-weight changes. (Same list as `docs/PRODUCT_VISION.md`
Non-Goals — kept in both files since one is the vision rationale and this
one is the enforcement checklist for every future phase's approval gates.)

## Decision Log

### 2026-09-12 — Product P0: Commercial + UX Baseline established

**Decision:** Adopted the product positioning "a personal second opinion
before the user walks out the door" over the prior implicit framing of "an
AI clothing-analysis dashboard." Established three core user jobs (Kombinime
Bak / Hangisini Giyeyim? / Şimdi Daha İyi mi?), six binding UX principles
(P1–P6 in `docs/PRODUCT_VISION.md`), the result information architecture
and share-card concepts in `docs/UX_CONTRACT.md`, and the phase roadmap in
`docs/PRODUCT_ROADMAP.md`.

**Scope:** Documentation only. No application code, prompt, model, UI, or
dependency changes.

**Depends on:** Phase 4.2's canonical-score guarantee (`docs/DECISIONS.md`)
for the future Before/After delta feature (Job 3 / Product P3) to be
trustworthy.

**Test evidence:** N/A — documentation phase. `npm test` and
`npx vite build` continue to pass unaffected (no files under `src/` or
`proxy/` were touched).

**Status:** PASS

**REAL_USER_VALIDATION:** NOT_TESTED
**REAL_SHARE_FLOW:** NOT_TESTED
**RETENTION_EVIDENCE:** NOT_AVAILABLE

**Recommended next phase:** Product P1 — Brand & Visual System (not started;
requires separate approval to begin, per the roadmap).

### 2026-09-12 — Product P2: Core Decision UX implemented

**Decision — verdict field:** The canonical DTO (`docs/DECISIONS.md`) has
one narrative text field, `genel_izlenim`, not two. The IA target in
`docs/UX_CONTRACT.md` ("verdict" then a separate "short explanation") was
implemented as **one** field serving both roles — `genel_izlenim` is
rendered once, directly beside the score, immediately after the photo. This
was judged sufficient rather than BLOCKED: `genel_izlenim` is already
written in the model's judgment-bearing voice (a 1–2 sentence assessment,
not a neutral description), so splitting it into a separate punchy tag plus
a restated explanation would either require inventing a client-side
score-threshold verdict generator (explicitly disallowed) or a Worker/prompt
change (out of scope for this phase). No contract change was made or
proposed.

**Implemented:**
- Removed the "Tek Kombin" / "İki Kombini Karşılaştır" mode toggle. The
  single-analysis flow is now the default photo-first entry (headline
  "Kombinini Göster" inside the existing upload dropzone); a plain-text
  link — "İki kombin arasında mı kaldın? **Hangisini Giyeyim? →**" — is the
  only compare entry point, appearing only before any photo is picked.
  Compare mode now opens under a "Hangisini Giyeyim?" heading with a "‹
  Geri" link back to single, replacing the old two-button toggle.
- Single-result hierarchy reordered to: photo → score + verdict
  (`genel_izlenim`) → **En Güçlü Taraf** (highest canonical criterion,
  ties broken by existing `CRITERIA` order — see `strongestCriterion()` in
  `src/constants.js`) → **Bir Kademe Yukarı** (existing `oneriler`, capped
  to 3) → full criterion breakdown ("Puan Dağılımı", unchanged label) with
  the confidence badge moved into this detail section (Level 3 per
  `docs/UX_CONTRACT.md`'s IA) → share/reset actions.
- Compare result screen, scoring math, and `compareVerdict()` are untouched
  — no additional AI call, no recalculated score, per this phase's
  constraints.

**Not implemented (explicitly deferred):** the "Nereye gidiyorsun?" occasion
question reword from `docs/UX_CONTRACT.md` — not in this phase's numbered
scope, left as-is to avoid an unrequested copy change.

**Test evidence:** `npm test` (32/32, unchanged — no Worker/validation code
touched) and `npx vite build`. Visual QA used a temporary in-memory
`runAnalysis` fixture (never committed — restored and diff-verified clean
before this commit) driven through a real headless-Chromium session to
screenshot the actual restructured result and compare screens.

**Status:** PASS

**REAL_USER_VALIDATION:** NOT_TESTED

**Recommended next phase:** Product P3 — Improvement Loop (not started;
requires separate approval to begin, per the roadmap).

### 2026-09-12 — Product P3: Improvement Loop implemented

**Decision — copy for the non-positive states:** The Before/After delta has
three states (`docs/DECISIONS.md`-style rule: delta is `after.puan -
before.puan`, computed once in `improvementDelta()`, `src/constants.js`,
never re-thresholded). Only the positive state has approved copy —
"ŞİMDİ OLDU." from the Job 3 example in `docs/PRODUCT_VISION.md`. No
approved line exists for a flat or worse result, so neutral uses a plain
factual sentence ("Değişen bir şey yok.") and negative reuses an
already-approved tone example from the same document's Brand Voice section
("Bir kez daha düşün.") rather than inventing new persona language. Neither
of the non-positive states was blocked; flagging the choice here since it's
the one piece of new copy this phase introduced.

**Implemented:**
- New primary CTA "Değiştirdim, tekrar bak" replaces "Sonucu Paylaş" as the
  dominant `BUTTON.primary` on a completed single result (per
  `docs/PRODUCT_VISION.md` Principle P4); Paylaş and Başka Bir Kombin Dene
  both demoted to `BUTTON.secondary`, so exactly one primary CTA remains
  per screen.
- Clicking it freezes the current result as BEFORE (`improvement` state in
  `src/App.jsx`) and re-enters the **existing** single-photo upload +
  analyze path unchanged to collect and score an AFTER photo — same
  `analyze()`, same `runAnalysis()`, same Worker endpoint, no new AI call
  type. `occasion` is simply never touched by the improvement handlers, so
  it's reused for AFTER unless the user changes the OccasionPicker
  themselves.
- A minimal "Önce: X/100" / "İptal" affordance appears while collecting the
  AFTER photo; the history strip and the "Hangisini Giyeyim?" compare-entry
  link are suppressed during this sub-flow so the user isn't invited to
  abandon the comparison context mid-loop.
- New `ImprovementResult` component renders BEFORE/AFTER photos, "ÖNCE x →
  SONRA y", the signed delta, and the state text — reading `before.puan`/
  `after.puan` directly off the two canonical Worker responses already in
  React state; nothing is recalculated, re-validated, or sent to a server a
  second time for this comparison.
- No share card for this screen (explicitly deferred — the Glow-up Card in
  `docs/UX_CONTRACT.md` is a later phase). No new photo storage: both
  images are the same already-blurred, in-memory data URLs already used for
  sharing elsewhere — nothing new touches the Worker or a server.

**Test evidence:** `npm test` (37/37 — 32 prior + 5 new in
`src/constants.test.js` covering positive/zero/negative delta and that
`improvementDelta()` is pure/stateless across calls) and `npx vite build`.
Visual QA used a temporary in-memory `runAnalysis` fixture (never
committed — restored and diff-verified clean) driven through headless
Chromium end-to-end: BEFORE result → CTA → AFTER photo collection → the
rendered Before/After screen, in both light and dark mode, plus a
negative-delta run confirming "Bir kez daha düşün." renders instead of any
"improved" language when the score fell.

**Status:** PASS

**REAL_USER_VALIDATION:** NOT_TESTED

**Recommended next phase:** Product P4 — Viral Sharing (not started;
requires separate approval to begin, per the roadmap).
