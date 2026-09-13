import { C } from '../constants.js';

export function CriterionRow({ label, weight, data, Icon }) {
  const p = Math.max(0, Math.min(100, Number(data?.puan) || 0));
  const tone = p >= 81 ? C.positive : p >= 41 ? C.warning : C.accent;
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex items-center justify-center shrink-0 rounded-full"
        style={{ width: 34, height: 34, background: C.surface, color: tone }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sans font-semibold" style={{ fontSize: 14, color: C.textPrimary }}>{label}</span>
          <span className="font-sans font-bold shrink-0" style={{ fontSize: 13, color: tone }}>%{p}</span>
        </div>
        <div
          className="relative mt-1.5"
          style={{ height: 4, background: C.borderSubtle, borderRadius: 999 }}
        >
          <div style={{ width: `${p}%`, height: '100%', background: tone, borderRadius: 999, transition: 'width 0.5s ease' }} />
        </div>
        {data?.aciklama && (
          <p className="font-sans mt-1.5" style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>{data.aciklama}</p>
        )}
        <span className="font-sans" style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>Ağırlık %{weight}</span>
      </div>
    </div>
  );
}
