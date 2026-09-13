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

### 2026-09-12 — Product P4: Viral Sharing implemented

**Decision — button hierarchy on screens that gained a second share action:**
Adding a whole-comparison "Karşılaştırmayı Paylaş" (Battle Card) button to
the compare-result screen created a second `BUTTON.primary` next to the two
existing per-side "Paylaş" buttons, which `docs/VISUAL_SYSTEM.md` forbids
("never two primaries in the same decision moment"). Resolved by demoting
the two per-side share buttons to `BUTTON.secondary` and making the new
whole-comparison share the single primary — sharing the comparison itself
is the higher-value acquisition surface this phase exists to add, and the
per-side score-card share remains available, just visually subordinate.
The same question didn't arise on `ImprovementResult` (no prior share
button existed there) or the single result (already resolved in Product
P3: "Değiştirdim, tekrar bak" primary, "Sonucu Paylaş" secondary).

**Decision — `import.meta.env` compatibility fix:** `compareVerdict()` (the
pure function the Battle Card's winner text depends on) lives in
`src/api.js`, which reads `import.meta.env.VITE_API_PROXY_URL` at module
scope — a Vite-only global that throws under Node's test runner before the
module can even be imported. Changed it to `import.meta.env?.VITE_API_PROXY_URL`
(optional chaining). This is a no-op under Vite (which always provides a
real `env` object) and was the smallest change that let `src/api.test.js`
import and test `compareVerdict()` directly with the existing zero-dependency
test setup, rather than duplicating or re-implementing the function
elsewhere just to make it testable.

**Implemented:**
- `src/share.js` restructured around shared helpers (`loadImage`,
  `drawCoverImage`, `wrapLines`, `renderCard`, `drawFooter`) and three card
  builders: `buildShareCardBlob` (Score Card, existing function enhanced —
  branding line moved into a shared footer used by all three cards, and a
  "Sen kaç verirdin?" prompt added under the verdict), `buildBattleCardBlob`
  (new — two photos, both canonical scores, `Bunu giy: <winner>` or the
  existing tie text from `compareVerdict()`, "Sen hangisini seçerdin?"),
  and `buildGlowUpCardBlob` (new — BEFORE/AFTER photos, "ÖNCE x → SONRA y",
  the signed delta and state text via the same `improvementDelta` /
  `improvementStateText` / `formatDelta` helpers `ImprovementResult.jsx`
  uses, so the shared card can never say something different from the UI).
  No card recalculates a score or applies a new threshold — every number
  drawn is a canonical `puan` (or their existing difference) already in
  React state.
- `src/App.jsx`: the three separate Web-Share-or-download implementations
  collapsed into one `shareBlob(blob, filename, shareText)` helper reused
  by `shareResult`, the new `shareBattle`, and the new `shareGlowUp` — same
  exact fallback behavior (Web Share API where `navigator.canShare`
  supports it, an `<a download>` link otherwise) preserved verbatim, now
  written once. Added a "Karşılaştırmayı Paylaş" primary button to the
  compare-result screen and a "Sonucu Paylaş" primary button to
  `ImprovementResult` (previously no share action existed there at all).
- No new photo storage, no tracking pixel, no analytics vendor, no user ID,
  no hidden metadata exposed: every card is built client-side from the same
  already-blurred, in-memory data URLs already used for the existing Score
  Card, and the Worker is not involved in generating or receiving any of
  this.

**Test evidence:** `npm test` (42/42 — 37 prior + 5 new: `formatDelta` and
`improvementStateText` in `src/constants.test.js`, and `compareVerdict`'s
three outcomes — A wins, B wins, tie — in the new `src/api.test.js`) and
`npx vite build`. Visual QA used a temporary in-memory `runAnalysis`
fixture (never committed — restored and diff-verified clean, leaving only
the one-line `import.meta.env?.` fix in `src/api.js`) driven through
headless Chromium: all three card types were actually generated end-to-end
(triggering each real share button, intercepting the blob the fallback path
produces via `URL.createObjectURL`, and saving it as a PNG) and visually
inspected — mobile layout, long-text wrapping, Turkish character rendering,
and the fallback path all confirmed directly from the generated pixels, not
inferred from code reading. A duplicate branding line was found this way on
the Score Card (old inline branding plus the new shared footer) and fixed
before commit. Compare-result and ImprovementResult dark-mode source UI
were also screenshotted, confirming exactly one primary button per screen
and legible `onAccent` contrast on both new buttons.

**Status:** PASS

**REAL_SHARE_FLOW:** NOT_TESTED (headless Chromium has no real share
target; the Web Share branch itself was not exercised on a device that
supports it — only the fallback download path was, since that's the path
headless Chromium's `navigator.canShare` takes)

**REAL_USER_VALIDATION:** NOT_TESTED

**Recommended next phase:** Product P5 — Retention (not started; requires
separate approval to begin, per the roadmap).

### 2026-09-12 — Product P5: Stil Yolculuğum (Retention) implemented

**Decision — no storage expansion:** The stored history schema
(`src/history.js`, `{id, score, blurb, thumb}`, written by `addHistoryEntry`
in `src/App.jsx`) has never recorded per-criterion scores or which
recommendations were shown. Two of the preferred retention insights —
"strongest recurring criterion" and "most common recommendation" — are
therefore not safely derivable from what's actually stored, and are **not
implemented**. Expanding the stored shape to fabricate this data was judged
not clearly necessary for the smallest useful retention layer: recent
analyses, average score, highest score, and a simple trend are already
fully derivable from the existing `score` field alone. `HISTORY_KEY` stays
`'nasilOlmusumHistory:v1'` — no schema version bump, no migration needed.

**Implemented:**
- New `src/insights.js` — three pure, stateless helpers reading only the
  existing `score` field: `averageScore`, `maxScore`, and `scoreTrend`
  (compares the newer half of history against the older half; returns
  `null` below 4 entries so a 1-2 point wobble is never reported as a
  trend). All three fail safely (return `null`, never throw) on empty,
  non-array, or malformed/legacy-shaped entries.
- `src/components/HistoryStrip.jsx`: section label renamed from "Geçmiş
  Kombinlerin" to **"Stil Yolculuğum"** (the exact name `docs/UX_CONTRACT.md`
  already gave this future feature under "Retention Direction"). A single
  quiet line — "Ortalama X · En yüksek Y · Son eğilim: yükselişte (+N)" —
  appears above the existing thumbnail strip only when an average exists;
  the trend segment only appears once `scoreTrend` has enough data. Reuses
  the existing `formatDelta` helper from Product P3 so a downward trend
  reads "düşüşte (-N)" plainly — never reframed as positive.
- No chart, no streak/gamification, no dashboard card, no new visibility
  condition: the block only ever renders where the old history strip
  already did (`mode === 'single' && !photoA.rawImage && !improvement`),
  so the core "Kombinini Göster" upload action stays the visually dominant
  element on that screen, unchanged.
- No new dependency, no account, no backend storage, no analytics vendor,
  no user ID, no original-image storage — everything reads the same
  `localStorage`-only history that already existed.

**Test evidence:** `npm test` (54/54 — 42 prior + 12 new in
`src/insights.test.js`: average/max normal + empty + malformed-entry
cases, trend's up/down/flat classification and its "not enough data"
floor, and a dedicated legacy-shaped-entry compatibility test) and
`npx vite build`. Visual QA seeded `localStorage` directly with the real
history schema (empty, 1 entry, 5 entries with an upward trend, 5 entries
with a downward trend) and screenshotted via headless Chromium at mobile
(390px) and desktop (1024px) widths in both light and dark mode — no
temporary fixture or stub was needed this phase (`src/api.js` has zero
diff), so nothing required reverting before commit.

**Status:** PASS

**REAL_RETENTION_EVIDENCE:** NOT_AVAILABLE

**Recommended next phase:** Product P6 — Monetization Gate is evidence
review only, not an implementation phase (`docs/PRODUCT_ROADMAP.md`); no
further Product implementation phase is queued without new direction.
