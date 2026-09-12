import { RefreshCw } from 'lucide-react';
import { C, RADIUS, BUTTON, improvementDelta } from '../constants.js';

function SectionLabel({ children }) {
  return (
    <div className="font-sans font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.08em', color: C.textMuted }}>
      {children}
    </div>
  );
}

// Job 3 — "Şimdi Daha İyi mi?" (Product P3). Renders a completed
// improvement-loop comparison. Never recalculates a score — both puan
// values come straight from the canonical Worker responses of the two
// analyses; this component only computes their difference for display.
export function ImprovementResult({ beforeResult, beforePhotoUrl, afterResult, afterPhotoUrl, onReset }) {
  const { before, after, delta, state } = improvementDelta(beforeResult.puan, afterResult.puan);
  const deltaText = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0';
  const stateColor = state === 'positive' ? C.positive : state === 'negative' ? C.accent : C.textSecondary;
  // "ŞİMDİ OLDU." is the approved Job 3 example copy (docs/PRODUCT_VISION.md).
  // No approved example exists for a flat or worse result, so those two are
  // plain, honest lines in the same restrained voice — never "improved"
  // language when the score didn't improve.
  const stateText = state === 'positive' ? 'ŞİMDİ OLDU.' : state === 'negative' ? 'Bir kez daha düşün.' : 'Değişen bir şey yok.';

  return (
    <div className="flex flex-col gap-8">
      <SectionLabel>Şimdi Daha İyi mi?</SectionLabel>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ minWidth: 0 }}>
          <p className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, letterSpacing: '0.05em' }}>Önce</p>
          <img
            src={beforePhotoUrl}
            alt="Önceki kombin"
            className="w-full object-cover"
            style={{ borderRadius: RADIUS.large, maxHeight: 240 }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.accent, marginBottom: 8, letterSpacing: '0.05em' }}>Sonra</p>
          <img
            src={afterPhotoUrl}
            alt="Yeni kombin"
            className="w-full object-cover"
            style={{ borderRadius: RADIUS.large, maxHeight: 240 }}
          />
        </div>
      </div>

      <div className="text-center" style={{ background: C.surfaceSubtle, borderRadius: RADIUS.large, padding: 24 }}>
        <p className="font-display" style={{ fontSize: 21, fontWeight: 600, color: C.textPrimary }}>
          ÖNCE {before} → SONRA {after}
        </p>
        <p className="font-display" style={{ fontSize: 36, fontWeight: 600, color: stateColor, marginTop: 8 }}>
          {deltaText}
        </p>
        <p className="font-sans font-semibold" style={{ fontSize: 15, color: stateColor, marginTop: 10 }}>
          {stateText}
        </p>
      </div>

      <button
        onClick={onReset}
        className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
        style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.secondary() }}
      >
        <RefreshCw size={16} /> Başka Bir Kombin Dene
      </button>
    </div>
  );
}
