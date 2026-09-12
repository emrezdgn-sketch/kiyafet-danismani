import { C, SHADOW, OCCASIONS } from '../constants.js';

export function OccasionPicker({ occasion, onChange }) {
  return (
    <div className="mb-6">
      <p className="font-sans font-semibold" style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 8 }}>
        Bu kombin ne için? <span style={{ color: C.inkFaint, fontWeight: 400 }}>(opsiyonel)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((o) => {
          const active = occasion?.key === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(active ? null : o)}
              className="press-btn font-sans font-semibold rounded-2xl"
              style={{
                fontSize: 12.5, padding: '8px 14px',
                color: active ? '#FFFFFF' : C.ink,
                background: active ? C.accent : C.bg,
                boxShadow: active ? SHADOW.accent : SHADOW.raisedSm,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
