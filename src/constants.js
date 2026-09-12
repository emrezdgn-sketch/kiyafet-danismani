import { Palette, Shirt, Ruler, Sun, Gem } from 'lucide-react';

// Raw palette (kept for existing call sites) plus the semantic layer new
// code should prefer — see docs/VISUAL_SYSTEM.md. Both point at the same
// CSS custom properties in src/index.css, so there is one source of truth.
export const C = {
  bg: 'var(--bg)',
  ink: 'var(--ink)',
  inkSoft: 'var(--ink-soft)',
  inkFaint: 'var(--ink-faint)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  line: 'var(--line)',

  surface: 'var(--color-surface)',
  surfaceSubtle: 'var(--color-surface-subtle)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  borderSubtle: 'var(--color-border-subtle)',
  accentHover: 'var(--color-accent-hover)',
  positive: 'var(--color-positive)',
  critical: 'var(--color-critical)',
  onAccent: 'var(--color-on-accent)',
};

export const RADIUS = {
  small: 'var(--radius-small)',
  medium: 'var(--radius-medium)',
  large: 'var(--radius-large)',
};

export const SHADOW = {
  inset: 'inset 5px 5px 11px var(--shadow-d2), inset -5px -5px 11px var(--shadow-l2)',
  // A single restrained ambient shadow — used sparingly for the few
  // surfaces that still warrant elevation (see docs/VISUAL_SYSTEM.md
  // "Shadows"). The old dual-light-dark neumorphic emboss is retired.
  soft: 'var(--shadow-soft)',
};

// Three-level button hierarchy (docs/VISUAL_SYSTEM.md "Button hierarchy").
// One dominant primary action per screen; secondary is an outline/ghost
// button; tertiary is a plain text action. Consumers spread the returned
// object onto a button's style prop.
export const BUTTON = {
  primary: (disabled = false) => ({
    // Disabled/loading uses a neutral surface with primary-toned text
    // rather than muted-on-muted — verified >10:1 contrast in both themes
    // (docs/VISUAL_SYSTEM.md "Accessibility"), unlike a straight opacity
    // fade which can wash out below AA on the light palette.
    color: disabled ? C.textPrimary : C.onAccent,
    background: disabled ? C.borderSubtle : C.accent,
    boxShadow: disabled ? SHADOW.inset : SHADOW.soft,
    border: '1px solid transparent',
  }),
  secondary: (disabled = false) => ({
    color: disabled ? C.textMuted : C.textPrimary,
    background: 'transparent',
    boxShadow: 'none',
    border: `1.5px solid ${C.borderSubtle}`,
  }),
  tertiary: {
    color: C.textSecondary,
    background: 'transparent',
    boxShadow: 'none',
    border: 'none',
  },
};

export const CRITERIA = [
  { key: 'color_palette', label: 'Renk Paleti', weight: 30, Icon: Palette },
  { key: 'style_cohesion', label: 'Stil Bütünlüğü', weight: 25, Icon: Shirt },
  { key: 'fit_and_silhouette', label: 'Silüet ve Oran', weight: 20, Icon: Ruler },
  { key: 'seasonal_suitability', label: 'Mevsim Uyumu', weight: 15, Icon: Sun },
  { key: 'accessories', label: 'Aksesuar Detayları', weight: 10, Icon: Gem },
];

export const OCCASIONS = [
  { key: 'gunluk', label: 'Günlük', hint: 'Bu kombin günlük, sıradan bir gün için düşünülmüş. Rahatlık ve günlük şıklık standartlarına göre değerlendir.' },
  { key: 'is', label: 'İş / Toplantı', hint: 'Bu kombin iş ortamı veya resmi bir toplantı için düşünülmüş. Ciddiyet, düzen ve profesyonellik standartlarına göre her zamankinden biraz daha sıkı değerlendir.' },
  { key: 'davet', label: 'Özel Davet', hint: 'Bu kombin özel bir davet veya özel bir gün için düşünülmüş. Şıklık ve özenin daha yüksek bir standartta olmasını bekle.' },
  { key: 'randevu', label: 'Randevu', hint: 'Bu kombin bir buluşma/randevu için düşünülmüş. Çekicilik ile özenli bir sadelik dengesini gözet.' },
];

export const SCORE_TIERS = [
  { max: 40, label: 'Sorunlu', color: C.accent },
  { max: 60, label: 'Vasat', color: C.warning },
  { max: 80, label: 'İyi', color: C.warning },
  { max: 92, label: 'Başarılı', color: C.success },
  { max: 100, label: 'Kusursuz', color: C.success },
];

export function scoreTier(p) {
  return SCORE_TIERS.find((t) => p <= t.max) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

// "En Güçlü Taraf" (Product P2): the highest-scoring canonical criterion.
// Never recalculates a score — reads the Worker's canonical kriterler as-is.
// Ties break by CRITERIA order (i.e. by weight, descending), since the
// strict `>` below only replaces the running best on a strictly higher score.
export function strongestCriterion(kriterler) {
  let best = null;
  for (const c of CRITERIA) {
    const score = Number(kriterler?.[c.key]?.puan);
    if (!Number.isFinite(score)) continue;
    if (!best || score > best.score) {
      best = { ...c, score, data: kriterler[c.key] };
    }
  }
  return best;
}

// "Şimdi Daha İyi mi?" (Product P3): the Before/After delta. Pure and
// stateless — takes only the two canonical "puan" values already produced
// by the Worker and never recomputes or adjusts either one. Ties (delta 0)
// are their own honest "neutral" state, never nudged toward "positive".
export function improvementDelta(beforePuan, afterPuan) {
  const before = Math.round(Number(beforePuan) || 0);
  const after = Math.round(Number(afterPuan) || 0);
  const delta = after - before;
  const state = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
  return { before, after, delta, state };
}

// Canvas-rendered share card can't read CSS custom properties, so these are
// literal hex values — must be kept in sync with the light-mode tokens in
// src/index.css (see docs/VISUAL_SYSTEM.md).
export const SHARE_PALETTE = {
  bg: '#F5F0E6', ink: '#2B251E', inkSoft: '#75695A', inkFaint: '#A89C89',
  accent: '#8B3A42', success: '#4C7A5E', warning: '#BE8A34', line: '#E6DECF',
};

export const HISTORY_LIMIT = 12;
