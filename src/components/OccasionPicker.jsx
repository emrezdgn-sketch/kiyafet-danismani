import { C, RADIUS, OCCASIONS } from '../constants.js';

export function OccasionPicker({ occasion, onChange }) {
  return (
    <div className="mb-6">
      <p className="font-sans font-semibold" style={{ fontSize: 12.5, color: C.textSecondary, marginBottom: 8 }}>
        Bu kombin ne için? <span style={{ color: C.textMuted, fontWeight: 400 }}>(opsiyonel)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((o) => {
          const active = occasion?.key === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(active ? null : o)}
              className="press-btn font-sans font-semibold"
              style={{
                fontSize: 12.5, padding: '8px 15px',
                borderRadius: RADIUS.medium,
                color: active ? C.onAccent : C.textPrimary,
                background: active ? C.accent : 'transparent',
                border: `1.5px solid ${active ? C.accent : C.borderSubtle}`,
                boxShadow: 'none',
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
