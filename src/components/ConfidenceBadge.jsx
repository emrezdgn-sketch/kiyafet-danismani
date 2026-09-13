import { useState } from 'react';
import { C } from '../constants.js';

const GUVEN_ACIKLAMA = 'Güven, bu değerlendirmenin ne kadar isabetli olabileceğini gösterir; fotoğrafın netliği, ışığı, çekim açısı ve kombinin ne kadarının net görünmesine bağlı olarak belirlenir. Yüksek güven, değerlendirmenin daha sağlam bir gözleme dayandığı anlamına gelir.';

export function ConfidenceBadge({ guven }) {
  const [open, setOpen] = useState(false);
  if (!guven || !guven.seviye) return null;
  const level = String(guven.seviye).toLowerCase();
  const tone = level === 'yüksek' ? C.positive : level === 'orta' ? C.warning : C.accent;
  const tooltip = guven.neden ? `${GUVEN_ACIKLAMA} Bu değerlendirmede: ${guven.neden}` : GUVEN_ACIKLAMA;
  return (
    <div
      className="relative inline-flex items-center gap-1.5 font-sans"
      style={{ fontSize: 11.5, fontWeight: 500, color: C.textMuted, marginTop: 8 }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: tone, display: 'inline-block' }} />
      Güven: {guven.seviye}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label="Güven ne demek?"
        aria-expanded={open}
        className="press-icon"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: 999, background: C.surface,
          color: C.textMuted, fontSize: 9.5, fontWeight: 700,
          cursor: 'pointer', marginLeft: 1, lineHeight: 1, border: 'none', padding: 0,
        }}
      >
        i
      </button>
      {open && (
        <div
          className="font-sans"
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 8, width: 230, zIndex: 20,
            background: '#2B251E', color: '#F5F0E6', fontSize: 12, fontWeight: 400, lineHeight: 1.5,
            padding: '10px 12px', borderRadius: 10,
            boxShadow: '4px 8px 20px rgba(0,0,0,0.35)',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
