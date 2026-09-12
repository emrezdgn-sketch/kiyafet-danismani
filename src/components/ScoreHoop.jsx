import { C, scoreTier } from '../constants.js';

export function ScoreHoop({ puan }) {
  const p = Math.max(0, Math.min(100, Number(puan) || 0));
  const tier = scoreTier(p);
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke={C.borderSubtle} strokeWidth="5" />
          <circle
            cx="50" cy="50" r="44" fill="none" stroke={tier.color} strokeWidth="5"
            strokeDasharray={`${(p / 100) * (2 * Math.PI * 44)} ${2 * Math.PI * 44}`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute font-display flex flex-col items-center" style={{ color: C.textPrimary, lineHeight: 1 }}>
          <span style={{ fontSize: 32, fontWeight: 600 }}>{p}</span>
          <span className="font-sans" style={{ fontSize: 10, color: C.textMuted, marginTop: 2, fontWeight: 600 }}>/100</span>
        </div>
      </div>
      <span
        className="font-sans uppercase"
        style={{ fontSize: 11.5, letterSpacing: '0.06em', color: tier.color, fontWeight: 700 }}
      >
        {tier.label}
      </span>
    </div>
  );
}
