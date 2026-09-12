import { RefreshCw, Share2 } from 'lucide-react';
import { C, RADIUS, BUTTON, improvementDelta, improvementStateText, formatDelta } from '../constants.js';

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
export function ImprovementResult({ beforeResult, beforePhotoUrl, afterResult, afterPhotoUrl, onReset, onShare, sharing }) {
  const { before, after, delta, state } = improvementDelta(beforeResult.puan, afterResult.puan);
  const deltaText = formatDelta(delta);
  const stateColor = state === 'positive' ? C.positive : state === 'negative' ? C.accent : C.textSecondary;
  const stateText = improvementStateText(state);

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

      <div className="flex flex-col gap-3">
        <button
          onClick={onShare}
          disabled={sharing}
          className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
          style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.primary(sharing) }}
        >
          <Share2 size={16} /> {sharing ? 'Kart hazırlanıyor…' : 'Sonucu Paylaş'}
        </button>

        <button
          onClick={onReset}
          className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
          style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.secondary() }}
        >
          <RefreshCw size={16} /> Başka Bir Kombin Dene
        </button>
      </div>
    </div>
  );
}
