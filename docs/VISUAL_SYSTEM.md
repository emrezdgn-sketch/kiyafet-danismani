# Visual System — Nasıl Olmuşum AI

> Source of truth for Product P2–P5 visual work. Rules future code can
> actually follow, not a branding manifesto. Implements the direction set in
> `docs/PRODUCT_VISION.md` (Principles P1–P6) and `docs/UX_CONTRACT.md`.
> Tokens live in `src/index.css` (`:root` and the dark-mode media block) and
> are re-exported for JS in `src/constants.js` (`C`, `RADIUS`, `SHADOW`,
> `BUTTON`).

## Brand Impression

Editorial, modern, calm, premium but approachable, fashion-aware,
mobile-first, restrained. Not an AI dashboard: no AI-tech clichés, excessive
gradients, neon, glassmorphism, or gamified visual noise.

## Design Principles

1. **Photo first** — the outfit photo is the visual hero; the UI supports
   it, never competes with it.
2. **Verdict before data** — score and one-line verdict lead; detailed
   criteria are secondary and visually quieter.
3. **One dominant accent** — a single brand accent color; no rainbow UI
   around score tiers.
4. **Reduce card soup** — a surface (background + radius) is used only
   where it improves hierarchy, never by default on every block.
5. **Restrained elevation** — at most one soft ambient shadow, used
   sparingly; no dual-shadow neumorphic emboss.

## Color Tokens

Defined in `src/index.css`, consumed via `C` in `src/constants.js`. Every
token has a light value in `:root` and a dark value under
`@media (prefers-color-scheme: dark)` — there is one semantic layer, not two
unrelated palettes.

| Semantic token (`C.*`) | CSS variable | Light | Dark |
|---|---|---|---|
| `background` (`C.bg`) | `--bg` | `#F5F0E6` warm ivory | `#1E1B17` warm charcoal |
| `surface` | `--color-surface` | `#EFE7D8` | `#262119` |
| `surfaceSubtle` | `--color-surface-subtle` | `#F9F5EC` | `#221E18` |
| `textPrimary` (`C.ink`) | `--ink` | `#2B251E` | `#F2EAD9` |
| `textSecondary` | `--ink-soft` | `#75695A` | `#B8AA96` |
| `textMuted` | `--ink-faint` | `#A89C89` | `#7C6F5D` |
| `borderSubtle` (`C.line`) | `--line` | `#E6DECF` | `#3A342C` |
| `accent` | `--accent` | `#8B3A42` restrained oxblood | `#D98F82` dusty rose |
| `accentHover` | `--color-accent-hover` | `#7A3038` | `#E3A296` |
| `onAccent` | `--color-on-accent` | `#FFFFFF` | `#1E1B17` |
| `positive` | `--success` | `#4C7A5E` | `#6FAE8A` |
| `warning` | `--warning` | `#BE8A34` | `#D9A54B` |
| `critical` | `--danger` | `#C0392B` | `#E2695A` |

**Rule: one dominant brand accent.** `accent` is the only saturated brand
color. Score tiers (`SCORE_TIERS` in `src/constants.js`) reuse the existing
three semantic colors (`accent`/`warning`/`positive`) — never invent a new
hue per tier.

**`onAccent` exists because a single text color does not work in both
themes.** The dark-mode accent is a bright, light dusty rose — white text on
it measures ~2.6:1 contrast (fails WCAG AA). Dark text on it measures
~6.6:1. Any new UI that fills a background with `C.accent` must use
`C.onAccent` for the text/icon on top of it, never a hardcoded `'#FFFFFF'`.
The canvas-rendered share card (`src/share.js`, `SHARE_PALETTE`) is a fixed
light-only palette and is exempt — it never switches to dark mode — but its
`accent` hex must still be kept in sync with the light-mode `--accent` value
by hand (documented at its definition in `src/constants.js`).

## Typography

Two roles, both loaded from the existing Google Fonts connection already
used before this phase (`index.html`) — no new font host was introduced,
one additional `family=` parameter was added to the same request.

- **Display / editorial** (`.font-display`, `--font-display`: Fraunces,
  falling back to Plus Jakarta Sans, then serif) — used sparingly: brand
  title (`<h1>`), the empty-photo-state headline, and the score number.
  Never for dense UI text, buttons, or descriptions.
- **UI** (`.font-sans` / default, `--font-sans`: Plus Jakarta Sans) —
  everything else: buttons, controls, criteria, descriptions, forms.

## Spacing

No parallel spacing-token system was introduced — Tailwind's default scale
(already in use throughout) *is* the spacing system. The rhythm actually in
use: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40` px steps (Tailwind's `1–10`
scale), with page-level vertical rhythm at `mb-8`/`mb-9`/`mb-10` between
major sections and `gap-3`/`gap-4`/`gap-5` inside them. Keep new UI on this
scale rather than introducing arbitrary pixel values.

Page width: `--page-max-width: 560px` (mobile/single-column, was 540px) and
`--page-max-width-wide: 1100px` (desktop two-column, unchanged), applied via
`.stylist-wrap` in `src/index.css`.

## Radius

| Token | Value | Use |
|---|---|---|
| `RADIUS.small` | `--radius-small` (12px) | small chips, history thumbnails |
| `RADIUS.medium` | `--radius-medium` (20px) | buttons, pills, the compare-result photo |
| `RADIUS.large` | `--radius-large` (28px) | the photo frame, the empty-upload zone, panels |

## Shadows

`SHADOW.soft` (`--shadow-soft`) is the only elevation shadow for new UI — a
single ambient shadow, not the retired dual-light-dark neumorphic emboss.
Use it sparingly (the photo frame, the enabled primary button). `SHADOW.inset`
remains for the disabled/loading button state. Most surfaces should have no
shadow at all — a hairline border (`C.borderSubtle`) or plain whitespace is
usually enough.

## Photo Treatment

The photo container has no padding — the image fills its frame edge to
edge, with `RADIUS.large` corners and `SHADOW.soft` as the only elevation.
The empty state is a thin dashed `borderSubtle` outline with no fill (a
light `surfaceSubtle` tint only appears on drag-over), not a heavy
neumorphic inset box. Face-blur overlay handles are unchanged in behavior;
their positioning math was simplified (and made more accurate) when the
padding was removed — see `docs/DECISIONS.md`-style note in
`src/components/PhotoSlot.jsx` history.

## Button Hierarchy

Defined once in `BUTTON` (`src/constants.js`), spread onto a button's
`style`:

- **`BUTTON.primary(disabled)`** — solid `accent` fill, `onAccent` text,
  `SHADOW.soft`. One per decision moment (e.g. "Kombini Değerlendir",
  "Sonucu Paylaş", "İkisini Karşılaştır"). Disabled/loading state swaps to a
  neutral `borderSubtle` fill with `textPrimary` text (verified >10:1
  contrast in both themes) rather than a muted-on-muted combination.
- **`BUTTON.secondary(disabled)`** — transparent fill, `borderSubtle`
  border, `textPrimary` text. For the alternative action next to a primary
  (e.g. "Başka Bir Kombin Dene", "Yeni Karşılaştırma").
- **`BUTTON.tertiary`** — no fill, no border, `textSecondary` text. For
  low-priority actions (e.g. "Temizle" in the history strip).

Never place two `BUTTON.primary` calls competing for attention in the same
decision moment.

## Surface / Card Rules

Default to no card. Add a `surface`/`surfaceSubtle` background only where it
resolves genuine ambiguity about grouping (e.g. the compare-mode verdict
panel, which is the headline of that screen). Where two adjacent sections
just need separation, use a `hairline-divider` (`<hr>` styled with
`border-top: 1px solid var(--color-border-subtle)`) plus whitespace instead
of a boxed card.

## Score Treatment

`ScoreHoop`: no card, no heavy shadow box. A thin single-color progress ring
(`borderSubtle` track, tier-color progress) around a large `.font-display`
number. The tier label is plain colored uppercase text, not a shadowed pill.

## Criteria / Confidence Treatment

`CriterionRow` is a Level-3 detail: a small flat icon token (no shadow), a
thin flat progress bar, no card. `ConfidenceBadge` is intentionally quiet —
muted text color with only the status dot carrying the tier color, so it
never competes with the verdict or score. Neither component's copy changed
in this phase (copy/reframing is Product P2 territory per `docs/UX_CONTRACT.md`).

## Mobile Behavior

Single column, `stylist-wrap` at 560px max-width, generous side padding
(`px-5`). A CSS Grid two-column layout (compare mode) must set
`min-width: 0` on its grid-item children — the default `min-width: auto`
lets a wide inline content row (e.g. two side-by-side buttons) force the
grid wider than its container, overflowing the viewport horizontally. This
was found and fixed during this phase's responsive check (390px); any new
`grid-template-columns` layout must include it. Button rows that might not
fit at narrow widths should use `flex-wrap: wrap` rather than causing
overflow.

## Dark Mode

Preserved — driven by `prefers-color-scheme`, no toggle. Every token above
has a dark value in the same `:root`/media-query structure as before this
phase; nothing forked into a second unrelated stylesheet. Avoid pure black:
the dark background is a warm `#1E1B17`, not `#000000`.

## Accessibility Rules

- Text/icon color on a solid `C.accent` fill must be `C.onAccent`, never a
  hardcoded white — see the Color Tokens section above.
- Disabled/loading buttons use `BUTTON.primary(true)`'s neutral
  `borderSubtle`/`textPrimary` pair (>10:1 contrast in both themes), not a
  muted-background/white-text pair (which measured ~2.7:1 in light mode
  during this phase's audit).
- Loading spinners inside a button use `stroke="currentColor"` so they
  always match that button's current (enabled or disabled) text color,
  instead of a hardcoded color that can go invisible or low-contrast
  depending on state/theme.
- Selection state (occasion pills, mode switch, compare winner) is never
  color-only: it also changes fill, border, and text color together.
- Keyboard focus: `.press-btn:focus-visible` renders a `2px solid accent`
  outline with `2px` offset — verified present and matching `:focus-visible`
  via automated check during this phase (see Product P1 final report).
- This is a heuristic contrast/behavior check performed during this phase
  (manual contrast-ratio calculation + automated focus-state inspection via
  a real browser), not a certified WCAG audit — do not describe it as
  WCAG-certified.
