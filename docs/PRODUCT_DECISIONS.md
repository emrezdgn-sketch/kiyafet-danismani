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
