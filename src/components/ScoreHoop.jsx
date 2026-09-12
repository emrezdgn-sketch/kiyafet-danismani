import { C, SHADOW, scoreTier } from '../constants.js';

export function ScoreHoop({ puan }) {
  const p = Math.max(0, Math.min(100, Number(puan) || 0));
  const tier = scoreTier(p);
  return (
    <div className="flex flex-col items-center gap-2.5 shrink-0">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: 108, height: 108, background: C.bg, boxShadow: SHADOW.raised }}
      >
        <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="44" cy="44" r="38" fill="none" stroke={C.line} strokeWidth="7" />
          <circle
            cx="44" cy="44" r="38" fill="none" stroke={tier.color} strokeWidth="7"
            strokeDasharray={`${(p / 100) * (2 * Math.PI * 38)} ${2 * Math.PI * 38}`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute font-sans flex flex-col items-center" style={{ color: C.ink, lineHeight: 1 }}>
          <span style={{ fontSize: 26, fontWeight: 800 }}>{p}</span>
          <span className="font-sans" style={{ fontSize: 10, color: C.inkFaint, marginTop: 2, fontWeight: 600 }}>/100</span>
        </div>
      </div>
      <span
        className="font-sans"
        style={{
          fontSize: 11.5, letterSpacing: '0.04em', color: tier.color, fontWeight: 700,
          background: C.bg, boxShadow: SHADOW.raisedSm, padding: '4px 12px', borderRadius: 999,
        }}
      >
        {tier.label}
      </span>
    </div>
  );
}
