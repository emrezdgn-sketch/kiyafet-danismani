# Product Vision — Nasıl Olmuşum AI

> Product definition only. No application code changes in this document or
> the phase that produced it (Product P0). See `docs/DECISIONS.md` for the
> technical architecture decisions this vision depends on.

## Positioning

The product is **not** primarily:

> "an AI clothing-analysis dashboard."

The product is:

> "a personal second opinion before the user walks out the door."

**Turkish positioning:**

> **Nasıl Olmuşum?**
> "Çıkmadan önce ikinci bir göz."

## Three Core User Jobs

The product answers three user questions. Each is a distinct job, not an
application "mode" — see `docs/UX_CONTRACT.md` for why mode-centric language
is explicitly avoided in the UI.

### Job 1 — Kombinime Bak

User question: **"Böyle çıksam olur mu?"**

Flow: photo → occasion → analysis → verdict → score → strongest point →
biggest improvement → actionable recommendations.

This is the existing single-analysis flow, reframed around a verdict rather
than a dashboard of metrics.

### Job 2 — Hangisini Giyeyim?

User question: **"A mı B mi?"**

Flow: photo A + photo B → occasion if useful → compare → winner → reason.

The user should feel they are resolving a decision, not selecting a
comparison tool.

### Job 3 — Şimdi Daha İyi mi?

User question: **"Öneriyi yaptım. Oldu mu?"**

Flow: BEFORE → recommendation → user changes outfit → AFTER → new analysis
→ score delta → verdict → share opportunity.

Example presentation concept (not final copy):

```
ÖNCE 72 → SONRA 86
+14
ŞİMDİ OLDU.
```

This job is **not implemented yet**. It depends on the score being a
deterministic function of the criterion scores, which is guaranteed as of
Phase 4.2 (`docs/DECISIONS.md`) — a score delta between two analyses is only
meaningful if neither score can be nudged by an unvalidated model claim.

## Binding Product Principles

**P1 — Photo First.** The user's outfit photo is the visual hero. Avoid
turning the result into a dashboard dominated by cards, meters, charts, or
AI widgets.

**P2 — Verdict Before Data.** Primary hierarchy: photo → short verdict
("Giy, çık.") → score (84/100) → one-sentence interpretation. Detailed
criterion analysis comes later, not first.

**P3 — Progressive Disclosure.** Do not remove the detailed analysis;
change its hierarchy. Top level: verdict, total score, short explanation,
strongest point, biggest improvement. Secondary detail: criterion
breakdown, confidence/analysis quality, extended explanation.

**P4 — One Clear Next Action.** After recommendations, the primary CTA
should eventually become "Değiştirdim, tekrar bak" — this creates the
product's improvement loop (Job 3).

**P5 — Fashion Product, Not AI Tool.** Avoid cliché AI visual language: AI
robots, glowing brains, excessive neon, purple AI gradients, unnecessary
glass effects, technical dashboards. AI stays behind the experience — the
user interacts with a fashion opinion, not an AI console.

**P6 — Editorial Visual Language (direction, not spec).** Future visual
direction: large photography, generous whitespace, restrained palette,
strong typography, one primary accent, fashion-editorial character.
Potential palette hypothesis for later design exploration: warm ivory,
charcoal, taupe, restrained burgundy/oxblood accent. These are design-
direction hypotheses only — no exact colors are implemented in P0.

## Brand Voice

Preserve the existing underlying personality: **meticulous, fair, confident
fashion opinion** (the current system prompt's "titiz mürebbiye" character —
see `proxy/worker.js` `SYSTEM_PROMPT`, unchanged by this phase).

Do **not** turn the brand into: an overly cheerful assistant, a robotic AI
stylist, an insulting fashion critic, or a generic motivational coach.

Tone examples (not mandatory strings): "Giy, çık.", "Şimdi oldu.", "Bir kez
daha düşün.", "Renk seçimin yerinde.", "Ayakkabı kombini aşağı çekiyor."

## Commercial Principles

- **No forced signup.** The first result must remain reachable without
  registration.
- **No early paywall.** No paywall before the user experiences core value.
  Monetization comes only after actual usage evidence.
- **No affiliate commerce yet.** Initial trust proposition: "Elindekilerle
  daha iyi görün." Recommendations must not be biased toward purchase
  behavior.
- **No digital wardrobe yet.** Do not expand into wardrobe cataloging
  unless future user evidence justifies it. The core wedge remains: helping
  the user decide what to wear before leaving.

## Non-Goals (require explicit approval before any implementation)

Authentication, database, social network/feed, wardrobe catalog, affiliate
links, payments, subscription, push notifications, user profiling, storage
of original uploaded photos, face identity recognition, a new AI model, new
AI persona modes, or criterion-weight changes.

## Privacy Contract

Preserve the current privacy architecture (client-side face blur before any
upload; the original photo is never sent to the Worker or Anthropic — see
`docs/ARCHITECTURE_BASELINE.md`) unless separately approved. The original
photo must not become persistent server-side data merely to support a
product feature. Any product feature involving images must be reviewed
against the current privacy model before implementation.

## Evidence Rules

Do not mark real-user outcomes PASS based on developer testing alone. Use
`REAL_USER_VALIDATION: NOT_TESTED`, `REAL_SHARE_FLOW: NOT_TESTED`, or
`RETENTION_EVIDENCE: NOT_AVAILABLE` where applicable. Do not invent
conversion rates, retention rates, willingness-to-pay, user preferences,
viral coefficient, or engagement improvements.
