import { C, SHADOW } from '../constants.js';

export function CriterionRow({ label, weight, data, Icon }) {
  const p = Math.max(0, Math.min(100, Number(data?.puan) || 0));
  const tone = p >= 81 ? C.success : p >= 41 ? C.warning : C.accent;
  return (
    <div className="flex items-start gap-3.5">
      <div
        className="flex items-center justify-center shrink-0 rounded-2xl"
        style={{ width: 42, height: 42, background: C.bg, boxShadow: SHADOW.raisedSm, color: tone }}
      >
        <Icon size={19} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sans font-semibold" style={{ fontSize: 14.5, color: C.ink }}>{label}</span>
          <span className="font-sans font-bold shrink-0" style={{ fontSize: 13.5, color: tone }}>%{p}</span>
        </div>
        <div
          className="relative mt-1.5"
          style={{ height: 8, background: C.bg, borderRadius: 999, boxShadow: SHADOW.inset }}
        >
          <div style={{ width: `${p}%`, height: '100%', background: tone, borderRadius: 999, transition: 'width 0.5s ease' }} />
        </div>
        {data?.aciklama && (
          <p className="font-sans mt-1.5" style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>{data.aciklama}</p>
        )}
        <span className="font-sans" style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600 }}>Ağırlık %{weight}</span>
      </div>
    </div>
  );
}
