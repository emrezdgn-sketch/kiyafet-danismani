import { C, SHADOW, scoreTier } from '../constants.js';

function SectionLabel({ children }) {
  return (
    <div className="font-sans font-bold uppercase" style={{ fontSize: 12.5, letterSpacing: '0.08em', color: C.ink }}>
      {children}
    </div>
  );
}

export function HistoryStrip({ history, onClear }) {
  if (!history.length) return null;
  return (
    <div className="mb-9">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Geçmiş Kombinlerin</SectionLabel>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Geçmiş kombin kayıtlarını silmek istediğine emin misin?')) onClear();
          }}
          className="font-sans font-semibold press-icon"
          style={{ fontSize: 11.5, color: C.inkFaint, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Temizle
        </button>
      </div>
      <div className="flex gap-3" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        {history.map((h) => {
          const tier = scoreTier(h.score);
          return (
            <div key={h.id} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 60 }} title={h.blurb || ''}>
              <div className="rounded-2xl overflow-hidden" style={{ width: 52, height: 52, background: C.line, boxShadow: SHADOW.raisedSm }}>
                {h.thumb && <img src={h.thumb} alt="" className="w-full h-full object-cover" />}
              </div>
              <span className="font-sans font-bold" style={{ fontSize: 11, color: tier.color }}>{h.score}</span>
            </div>
          );
        })}
      </div>
      <p className="font-sans" style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 8 }}>
        Sadece bu cihazda, tarayıcında saklanır.
      </p>
    </div>
  );
}
