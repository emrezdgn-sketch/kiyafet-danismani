# UX Contract — Nasıl Olmuşum AI

> Product/UX definition only — nothing in this document is implemented yet.
> This is the contract future implementation phases (Product P1+) must
> follow. See `docs/PRODUCT_VISION.md` for positioning and principles this
> contract expresses in UI terms, and `docs/PRODUCT_ROADMAP.md` for when
> each part gets built.

## Home Screen Principle

Preferred future hierarchy:

```
NASIL OLMUŞUM?
Çıkmadan önce ikinci bir göz.

[ + KOMBİNİNİ GÖSTER ]

İki kombin arasında mı kaldın?
→ Hangisini Giyeyim?
```

Do not expose implementation-centric terminology such as "Single Mode",
"Compare Mode", "Tek Kombin Modu", or "Comparison Tool". Product language
describes user intent (see Job 1 / Job 2 in `docs/PRODUCT_VISION.md`), not
an application mode switch.

## Occasion UX

Occasion is commercially and analytically important, but must not become a
heavy onboarding step.

Preferred flow: select photo → "Nereye gidiyorsun?" with quick options
(Günlük, İş, Buluşma, Gece, Davet, Diğer).

Do not add multi-step onboarding. Do not require account creation.

## Result Information Architecture

Proposed future hierarchy (progressive disclosure — see Principle P3 in
`docs/PRODUCT_VISION.md`):

**Level 1:** Photo, verdict, score, one-sentence interpretation.

**Level 2:** "En güçlü taraf", "Bir kademe yukarı" (max ~3 high-value
recommendations).

**Level 3:** Detailed criterion breakdown, confidence/analysis-quality
information, additional explanation.

Not implemented yet.

## Recommendation Section

Current concept "Küçük Ayarlamalar" (`src/App.jsx` section label) should be
evaluated for future repositioning toward **"Bir Kademe Yukarı"**.

Recommendations should remain: concrete, short, actionable, primarily
achievable using what the user already owns, and limited in number. The
product should initially avoid becoming a shopping recommendation engine
(see Commercial Principles in `docs/PRODUCT_VISION.md`).

## Confidence Presentation

The technical concept "confidence" (`guven` in the canonical contract —
`docs/DECISIONS.md`) may be misunderstood by normal users. Evaluate future
wording such as "Fotoğraf okunabilirliği" or "Analiz kalitesi". Low
confidence should explain *why* analysis quality is limited and suggest
retaking the photo.

Do not change the AI confidence calculation in P0 — this is copy/framing
guidance only, not a change to `guven.seviye` semantics.

## Share Strategy

Future sharing should support three product stories (not implemented in
P0 — current share card in `src/share.js` is unchanged):

**Share Type 1 — Score Card**
```
NASIL OLMUŞUM?
[PHOTO]
87
GİY, ÇIK.
Sen kaç verirdin?
```

**Share Type 2 — Battle Card**
```
HANGİSİNİ GİYEYİM?
A         B
78        91
          ✓
AI B dedi.
Sen?
```

**Share Type 3 — Glow-up Card**
```
ŞİMDİ OLDU.
BEFORE       AFTER
71     →      88
+17
```

The Glow-up Card depends on the Job 3 improvement loop (Product P3) and the
deterministic score guarantee from Phase 4.2.

## Retention Direction

Existing history functionality (`src/history.js`, currently
`localStorage`-only) should eventually evolve toward **"Stil Yolculuğum"**:
recent analyses, average score trend, strongest repeated criterion,
recurring improvement recommendation, personal best.

Do not add an account or database yet. Local-first exploration is
preferred until cross-device demand is demonstrated.

## What This Contract Does Not Authorize

This document defines target UX direction. It does not authorize:
implementation of any listed screen, copy finalization, exact color
values, or component changes. Each item here becomes real only inside a
future Product phase that follows the governance template in
`docs/PRODUCT_DECISIONS.md` and passes its approval gates.
