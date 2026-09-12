import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight, RefreshCw, Share2 } from 'lucide-react';
import { C, SHADOW, CRITERIA, HISTORY_LIMIT } from './constants.js';
import { runAnalysis, compareVerdict } from './api.js';
import { loadHistory, saveHistory, makeThumbnail } from './history.js';
import { buildShareCardBlob } from './share.js';
import { usePhotoEditor } from './hooks/usePhotoEditor.js';
import { ScoreHoop } from './components/ScoreHoop.jsx';
import { CriterionRow } from './components/CriterionRow.jsx';
import { ConfidenceBadge } from './components/ConfidenceBadge.jsx';
import { ErrorBanner } from './components/ErrorBanner.jsx';
import { HistoryStrip } from './components/HistoryStrip.jsx';
import { OccasionPicker } from './components/OccasionPicker.jsx';
import { PhotoSlot } from './components/PhotoSlot.jsx';

function SectionLabel({ children }) {
  return (
    <div className="font-sans font-bold uppercase" style={{ fontSize: 12.5, letterSpacing: '0.08em', color: C.ink }}>
      {children}
    </div>
  );
}

export default function OutfitStylist() {
  const photoA = usePhotoEditor();
  const photoB = usePhotoEditor();
  const [mode, setMode] = useState('single');
  const [occasion, setOccasion] = useState(null);

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [compareStatus, setCompareStatus] = useState('idle');
  const [compareResult, setCompareResult] = useState(null);

  const [history, setHistory] = useState(() => loadHistory());
  const [sharing, setSharing] = useState(false);
  const resultsRef = useRef(null);

  const addHistoryEntry = useCallback((safeImage, parsed) => {
    makeThumbnail(safeImage.dataUrl).then((thumb) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        score: Math.max(0, Math.min(100, Number(parsed.puan) || 0)),
        blurb: parsed.genel_izlenim || '',
        thumb,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, HISTORY_LIMIT);
        saveHistory(next);
        return next;
      });
    });
  }, []);

  const analyze = useCallback(async () => {
    if (!photoA.safeImage) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const parsed = await runAnalysis(photoA.safeImage, occasion);
      setResult(parsed);
      setStatus('done');
      addHistoryEntry(photoA.safeImage, parsed);
    } catch (err) {
      console.error('Kombin analizi hatası:', err);
      setErrorMsg(`Kombinini değerlendirirken bir sorun oldu: ${err.message}`);
      setStatus('error');
    }
  }, [photoA.safeImage, occasion, addHistoryEntry]);

  const compareAnalyze = useCallback(async () => {
    if (!photoA.safeImage || !photoB.safeImage) return;
    setCompareStatus('loading');
    setErrorMsg('');
    try {
      const [a, b] = await Promise.all([
        runAnalysis(photoA.safeImage, occasion),
        runAnalysis(photoB.safeImage, occasion),
      ]);
      setCompareResult({ a, b });
      setCompareStatus('done');
      addHistoryEntry(photoA.safeImage, a);
      addHistoryEntry(photoB.safeImage, b);
    } catch (err) {
      console.error('Karşılaştırma hatası:', err);
      setErrorMsg(`Karşılaştırma sırasında bir sorun oldu: ${err.message}`);
      setCompareStatus('error');
    }
  }, [photoA.safeImage, photoB.safeImage, occasion, addHistoryEntry]);

  useEffect(() => {
    if (((status === 'done' && result) || (compareStatus === 'done' && compareResult)) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status, result, compareStatus, compareResult]);

  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const reset = () => {
    photoA.reset();
    setResult(null);
    setStatus('idle');
    setErrorMsg('');
  };

  const resetCompare = () => {
    photoA.reset();
    photoB.reset();
    setCompareResult(null);
    setCompareStatus('idle');
    setErrorMsg('');
  };

  const switchMode = (next) => {
    if (next === mode) return;
    photoA.reset();
    photoB.reset();
    setResult(null);
    setStatus('idle');
    setCompareResult(null);
    setCompareStatus('idle');
    setErrorMsg('');
    setMode(next);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const shareResult = useCallback(async (safeImageToShare, resultToShare) => {
    if (!resultToShare || !safeImageToShare || sharing) return;
    setSharing(true);
    try {
      const blob = await buildShareCardBlob(safeImageToShare.dataUrl, resultToShare);
      const file = new File([blob], 'nasil-olmusum.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Nasıl Olmuşum AI',
          text: `Kombinim ${Math.round(resultToShare.puan)}/100 aldı.`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nasil-olmusum.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        setErrorMsg('Paylaşım kartı oluşturulamadı. Tekrar dener misin?');
      }
    } finally {
      setSharing(false);
    }
  }, [sharing]);

  const noPhotoYet = !photoA.rawImage && !photoB.rawImage;

  return (
    <div className="min-h-screen w-full flex justify-center font-sans" style={{ background: C.bg }}>
      <div className="w-full stylist-wrap px-5 py-10">
        {/* Header */}
        <div className="mb-9">
          <div className="font-sans font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.1em', color: C.accent }}>
            Moda ve Stil Analizörü
          </div>
          <h1 className="font-sans" style={{ fontSize: 34, fontWeight: 800, color: C.ink, marginTop: 6, letterSpacing: '-0.01em' }}>
            Nasıl Olmuşum AI
          </h1>
          <p className="font-sans" style={{ fontSize: 15, color: C.inkSoft, marginTop: 8, lineHeight: 1.55 }}>
            Bir fotoğraf yükle; stil, renk uyumu ve mevsim uygunluğunu değerlendirip alternatif öneriler sunayım.
          </p>
        </div>

        {noPhotoYet && (
          <div className="flex gap-2 mb-7">
            <button
              type="button"
              onClick={() => switchMode('single')}
              className="press-btn font-sans font-semibold rounded-2xl"
              style={{
                fontSize: 13, padding: '10px 16px',
                color: mode === 'single' ? '#FFFFFF' : C.ink,
                background: mode === 'single' ? C.accent : C.bg,
                boxShadow: mode === 'single' ? SHADOW.accent : SHADOW.raisedSm,
              }}
            >
              Tek Kombin
            </button>
            <button
              type="button"
              onClick={() => switchMode('compare')}
              className="press-btn font-sans font-semibold rounded-2xl"
              style={{
                fontSize: 13, padding: '10px 16px',
                color: mode === 'compare' ? '#FFFFFF' : C.ink,
                background: mode === 'compare' ? C.accent : C.bg,
                boxShadow: mode === 'compare' ? SHADOW.accent : SHADOW.raisedSm,
              }}
            >
              İki Kombini Karşılaştır
            </button>
          </div>
        )}

        {mode === 'single' && !photoA.rawImage && <HistoryStrip history={history} onClear={clearHistory} />}

        {mode === 'single' && (
          !photoA.rawImage ? (
            <>
              <PhotoSlot photo={photoA} />
              {status === 'error' && <ErrorBanner message={errorMsg} />}
            </>
          ) : (
            <div className="stylist-layout">
              <div className="stylist-photo-col">
                <PhotoSlot photo={photoA} locked={status === 'done'} />

                {status !== 'done' && <OccasionPicker occasion={occasion} onChange={setOccasion} />}

                {status !== 'done' && (
                  <button
                    onClick={analyze}
                    disabled={status === 'loading' || photoA.blurring || !photoA.safeImage}
                    className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold mb-8 rounded-2xl"
                    style={{
                      fontSize: 15.5, color: '#FFFFFF',
                      background: (status === 'loading' || photoA.blurring || !photoA.safeImage) ? C.inkFaint : C.accent,
                      padding: '16px 16px',
                      boxShadow: (status === 'loading' || photoA.blurring || !photoA.safeImage) ? SHADOW.inset : SHADOW.accent,
                    }}
                  >
                    {photoA.blurring ? (
                      'Fotoğraf hazırlanıyor…'
                    ) : status === 'loading' ? (
                      <>
                        <svg width="17" height="17" viewBox="0 0 16 16" className="spin-anim" style={{ animation: 'spin 0.8s linear infinite' }}>
                          <circle cx="8" cy="8" r="6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="20 20" strokeLinecap="round" opacity="0.85" />
                        </svg>
                        Kombin inceleniyor…
                      </>
                    ) : (
                      <>Kombini Değerlendir <ChevronRight size={16} /></>
                    )}
                  </button>
                )}

                {status === 'error' && <ErrorBanner message={errorMsg} />}
              </div>

              {status === 'done' && result && (
                <div className="stylist-results-col" ref={resultsRef}>
                <div className="flex flex-col gap-8">
                  <div
                    className="flex items-start gap-5 rounded-3xl"
                    style={{ background: C.bg, boxShadow: SHADOW.raised, padding: 22 }}
                  >
                    <ScoreHoop puan={result.puan} />
                    <div style={{ paddingTop: 4 }}>
                      <p className="font-sans" style={{ fontSize: 15.5, color: C.ink, lineHeight: 1.55, fontWeight: 500 }}>
                        {result.genel_izlenim}
                      </p>
                      <ConfidenceBadge guven={result.guven} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <SectionLabel>Puan Dağılımı</SectionLabel>
                    <div
                      className="flex flex-col gap-5 rounded-3xl"
                      style={{ background: C.bg, boxShadow: SHADOW.raised, padding: 22 }}
                    >
                      {CRITERIA.map((c) => (
                        <CriterionRow key={c.key} label={c.label} weight={c.weight} data={result.kriterler?.[c.key]} Icon={c.Icon} />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <SectionLabel>Küçük Ayarlamalar</SectionLabel>
                    <div
                      className="flex flex-col gap-4 rounded-3xl"
                      style={{ background: C.bg, boxShadow: SHADOW.raised, padding: 22 }}
                    >
                      {(result.oneriler || []).map((o, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span
                            className="font-sans font-bold flex items-center justify-center shrink-0 rounded-full"
                            style={{ width: 24, height: 24, fontSize: 11.5, color: C.accent, background: C.bg, boxShadow: SHADOW.inset }}
                          >
                            {i + 1}
                          </span>
                          <p className="font-sans" style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.55, paddingTop: 2 }}>{o}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => shareResult(photoA.safeImage, result)}
                    disabled={sharing}
                    className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold rounded-2xl"
                    style={{
                      fontSize: 14.5, color: '#FFFFFF',
                      background: sharing ? C.inkFaint : C.accent,
                      boxShadow: sharing ? SHADOW.inset : SHADOW.accent,
                      padding: '15px 16px',
                    }}
                  >
                    <Share2 size={16} /> {sharing ? 'Kart hazırlanıyor…' : 'Sonucu Paylaş'}
                  </button>

                  <button
                    onClick={reset}
                    className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold rounded-2xl"
                    style={{ fontSize: 14.5, color: C.ink, background: C.bg, boxShadow: SHADOW.raisedSm, padding: '15px 16px' }}
                  >
                    <RefreshCw size={16} /> Başka Bir Kombin Dene
                  </button>
                </div>
                </div>
              )}
            </div>
          )
        )}

        {mode === 'compare' && (
          <div>
            {compareStatus !== 'done' && (
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <p className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.accent, marginBottom: 8, letterSpacing: '0.05em' }}>Kombin A</p>
                  <PhotoSlot photo={photoA} compact />
                </div>
                <div>
                  <p className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.accent, marginBottom: 8, letterSpacing: '0.05em' }}>Kombin B</p>
                  <PhotoSlot photo={photoB} compact />
                </div>
              </div>
            )}

            {compareStatus !== 'done' && (photoA.rawImage || photoB.rawImage) && (
              <div className="mt-6">
                <OccasionPicker occasion={occasion} onChange={setOccasion} />

                <button
                  onClick={compareAnalyze}
                  disabled={compareStatus === 'loading' || photoA.blurring || photoB.blurring || !photoA.safeImage || !photoB.safeImage}
                  className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold rounded-2xl"
                  style={{
                    fontSize: 15.5, color: '#FFFFFF',
                    background: (compareStatus === 'loading' || photoA.blurring || photoB.blurring || !photoA.safeImage || !photoB.safeImage) ? C.inkFaint : C.accent,
                    padding: '16px 16px',
                    boxShadow: (compareStatus === 'loading' || photoA.blurring || photoB.blurring || !photoA.safeImage || !photoB.safeImage) ? SHADOW.inset : SHADOW.accent,
                  }}
                >
                  {compareStatus === 'loading' ? (
                    <>
                      <svg width="17" height="17" viewBox="0 0 16 16" className="spin-anim" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <circle cx="8" cy="8" r="6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="20 20" strokeLinecap="round" opacity="0.85" />
                      </svg>
                      İkisi de inceleniyor…
                    </>
                  ) : (
                    <>İkisini Karşılaştır <ChevronRight size={16} /></>
                  )}
                </button>
                <p className="font-sans text-center" style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 10 }}>
                  Bu işlem iki ayrı değerlendirme yapar: her kombin tek tek puanlanır (tek-kombin değerlendirmesinin iki katı).
                </p>

                {compareStatus === 'error' && <ErrorBanner message={errorMsg} />}
              </div>
            )}

            {compareStatus === 'done' && compareResult && (() => {
              const verdict = compareVerdict(compareResult.a, compareResult.b);
              const sides = [
                { label: 'A', photo: photoA, r: compareResult.a },
                { label: 'B', photo: photoB, r: compareResult.b },
              ];
              return (
                <div ref={resultsRef} className="flex flex-col gap-6 mt-8">
                  <div className="rounded-3xl text-center" style={{ background: C.bg, boxShadow: SHADOW.raised, padding: 22 }}>
                    <SectionLabel>Sonuç</SectionLabel>
                    <p className="font-sans font-bold" style={{ fontSize: 17, color: C.ink, marginTop: 8 }}>{verdict.text}</p>
                  </div>

                  <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {sides.map(({ label, photo, r }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-4 rounded-3xl"
                        style={{
                          background: C.bg, padding: 18,
                          boxShadow: verdict.winner === label ? SHADOW.accent : SHADOW.raised,
                        }}
                      >
                        <span className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.accent, letterSpacing: '0.05em' }}>
                          Kombin {label} {verdict.winner === label ? '· Kazanan' : ''}
                        </span>
                        <img
                          src={(photo.safeImage || photo.rawImage).dataUrl}
                          alt={`Kombin ${label}`}
                          className="w-full object-cover rounded-2xl"
                          style={{ maxHeight: 220 }}
                        />
                        <div className="flex items-start gap-3">
                          <ScoreHoop puan={r.puan} />
                          <p className="font-sans" style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5, fontWeight: 500, paddingTop: 4 }}>
                            {r.genel_izlenim}
                          </p>
                        </div>
                        <button
                          onClick={() => shareResult(photo.safeImage, r)}
                          disabled={sharing}
                          className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold rounded-2xl"
                          style={{
                            fontSize: 13, color: '#FFFFFF',
                            background: sharing ? C.inkFaint : C.accent,
                            boxShadow: sharing ? SHADOW.inset : SHADOW.accent,
                            padding: '11px 14px',
                          }}
                        >
                          <Share2 size={13} /> Paylaş
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={resetCompare}
                    className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold rounded-2xl"
                    style={{ fontSize: 14.5, color: C.ink, background: C.bg, boxShadow: SHADOW.raisedSm, padding: '15px 16px' }}
                  >
                    <RefreshCw size={16} /> Yeni Karşılaştırma
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
