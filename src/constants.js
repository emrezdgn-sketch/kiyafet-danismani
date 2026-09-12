import { Palette, Shirt, Ruler, Sun, Gem } from 'lucide-react';

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
};

export const SHADOW = {
  raised: '9px 9px 20px var(--shadow-d1), -9px -9px 20px var(--shadow-l1)',
  raisedSm: '5px 5px 12px var(--shadow-d2), -5px -5px 12px var(--shadow-l2)',
  inset: 'inset 5px 5px 11px var(--shadow-d2), inset -5px -5px 11px var(--shadow-l2)',
  accent: '7px 7px 16px var(--shadow-ad), -5px -5px 14px var(--shadow-al)',
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

export const SHARE_PALETTE = {
  bg: '#F5F0E6', ink: '#2B251E', inkSoft: '#75695A', inkFaint: '#A89C89',
  accent: '#B5563D', success: '#4C7A5E', warning: '#BE8A34', line: '#E6DECF',
};

export const HISTORY_LIMIT = 12;
