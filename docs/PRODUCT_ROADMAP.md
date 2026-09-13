# Product Roadmap — Nasıl Olmuşum AI

> Two separate axes are tracked here: **feature priority tiers** (what
> matters most, independent of when it ships) and the **phase roadmap**
> (the sequence phases actually execute in). Both reuse P0/P1/P2 labels per
> the original product brief — read the section headers, not just the
> label, to tell them apart.

## Feature Priority Tiers

**P0 / CORE**
- Clear verdict
- Photo-first hierarchy
- Occasion context
- "Hangisini Giyeyim?"
- Improvement CTA
- Before/After foundation
- Improved share loop

**P1**
- Stil Yolculuğum
- Richer retention behavior

**P2**
- Optional tone/persona experiments

**LATER / EVIDENCE REQUIRED**
- Accounts
- Subscription
- Affiliate commerce
- Wardrobe catalog
- Social feed

## Phase Roadmap

**PRODUCT P0 — Commercial + UX Baseline** *(this phase)*
Documentation only: `docs/PRODUCT_VISION.md`, `docs/UX_CONTRACT.md`,
`docs/PRODUCT_ROADMAP.md`, `docs/PRODUCT_DECISIONS.md`. No application code
changed.

**PRODUCT P1 — Brand & Visual System**
Visual hierarchy, typography, spacing, palette, component visual language,
photo-first layout. No new business capability.

**PRODUCT P2 — Core Decision UX**
New homepage hierarchy, intent-based entry, occasion flow, verdict-first
result, progressive disclosure, "Bir Kademe Yukarı".

**PRODUCT P3 — Improvement Loop**
"Değiştirdim, tekrar bak", Before/After, deterministic delta presentation,
regression protection. Depends on the Phase 4.2 canonical-score guarantee
(`docs/DECISIONS.md`) — a score delta is only trustworthy because `puan` is
now a pure function of `kriterler`.

**PRODUCT P4 — Viral Sharing**
Score Card, Battle Card, Glow-up Card, privacy-safe sharing, attribution
strategy.

**PRODUCT P5 — Retention**
Stil Yolculuğum, local-first insights, repeat-use metrics.

**PRODUCT P6 — Monetization Gate**
Evidence review only before any monetization implementation — not an
implementation phase itself.

## Architecture Dependencies

| Product phase | Depends on |
|---|---|
| P2 (verdict-first result) | Canonical DTO shape (`docs/DECISIONS.md`, Phase 4.1) — `genel_izlenim`/`puan` already exist as top-level fields |
| P3 (Before/After delta) | Deterministic `puan` (Phase 4.2) — score is reproducible from `kriterler`, so two analyses can be diffed meaningfully |
| P3 (regression protection) | `docs/REGRESSION_MATRIX.md` — must be extended with new flows before P3 ships |
| P4 (share cards) | Current privacy model (`docs/ARCHITECTURE_BASELINE.md`) — face-blurred image only, never the original |
| P5 (Stil Yolculuğum) | Existing `src/history.js` (localStorage) — no backend/database exists or is planned until P5 evidence justifies one |

## Governance

Every phase from P1 onward must be proposed and executed using the
governance template defined in `docs/PRODUCT_DECISIONS.md`, including its
approval gates and evidence rules. Claude may implement approved product
decisions; Claude must not independently make new strategic product
decisions.
