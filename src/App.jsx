import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight, RefreshCw, Share2 } from 'lucide-react';
import { C, RADIUS, BUTTON, CRITERIA, HISTORY_LIMIT, strongestCriterion } from './constants.js';
import { runAnalysis, compareVerdict } from './api.js';
import { loadHistory, saveHistory, makeThumbnail } from './history.js';
import { buildShareCardBlob, buildBattleCardBlob, buildGlowUpCardBlob } from './share.js';
import { usePhotoEditor } from './hooks/usePhotoEditor.js';
import { ScoreHoop } from './components/ScoreHoop.jsx';
import { CriterionRow } from './components/CriterionRow.jsx';
import { ConfidenceBadge } from './components/ConfidenceBadge.jsx';
import { ErrorBanner } from './components/ErrorBanner.jsx';
import { HistoryStrip } from './components/HistoryStrip.jsx';
import { OccasionPicker } from './components/OccasionPicker.jsx';
import { PhotoSlot } from './components/PhotoSlot.jsx';
import { ImprovementResult } from './components/ImprovementResult.jsx';

function SectionLabel({ children }) {
  return (
    <div className="font-sans font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.08em', color: C.textMuted }}>
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

  // Job 3 — "Şimdi Daha İyi mi?" (Product P3). null outside the loop; while
  // active, holds the frozen BEFORE result/photo so a second run of the
  // existing single-analysis path can be compared against it. occasion is
  // intentionally left untouched here so the AFTER run reuses the same
  // context unless the user changes the OccasionPicker themselves.
  const [improvement, setImprovement] = useState(null);

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
    setImprovement(null);
  };

  // "Değiştirdim, tekrar bak": freeze the current result as BEFORE, then
  // hand the flow back to the existing single-photo upload + analyze path
  // (reused as-is) to collect and score the AFTER photo. No new AI call
  // type, no server-side storage — beforePhotoUrl is just the same
  // already-blurred data URL already held in memory for sharing.
  const startImprovementLoop = () => {
    const beforePhoto = photoA.safeImage || photoA.rawImage;
    if (!result || !beforePhoto) return;
    setImprovement({ beforeResult: result, beforePhotoUrl: beforePhoto.dataUrl });
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

  // Shared Web-Share-or-download fallback for every card type (Product P4).
  // Preserves the exact existing behavior: Web Share API where supported,
  // an <a download> link otherwise. Callers only need to build the blob.
  const shareBlob = useCallback(async (blob, filename, shareText) => {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Nasıl Olmuşum AI', text: shareText });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  }, []);

  const shareResult = useCallback(async (safeImageToShare, resultToShare) => {
    if (!resultToShare || !safeImageToShare || sharing) return;
    setSharing(true);
    try {
      const blob = await buildShareCardBlob(safeImageToShare.dataUrl, resultToShare);
      await shareBlob(blob, 'nasil-olmusum.png', `Kombinim ${Math.round(resultToShare.puan)}/100 aldı.`);
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        setErrorMsg('Paylaşım kartı oluşturulamadı. Tekrar dener misin?');
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, shareBlob]);

  const shareBattle = useCallback(async () => {
    if (!compareResult || sharing) return;
    setSharing(true);
    try {
      const verdict = compareVerdict(compareResult.a, compareResult.b);
      const blob = await buildBattleCardBlob(
        (photoA.safeImage || photoA.rawImage).dataUrl,
        (photoB.safeImage || photoB.rawImage).dataUrl,
        compareResult.a, compareResult.b, verdict,
      );
      const shareText = verdict.winner ? `Bunu giy: ${verdict.winner}. Sen hangisini seçerdin?` : verdict.text;
      await shareBlob(blob, 'hangisini-giyeyim.png', shareText);
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        setErrorMsg('Paylaşım kartı oluşturulamadı. Tekrar dener misin?');
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, shareBlob, compareResult, photoA.safeImage, photoA.rawImage, photoB.safeImage, photoB.rawImage]);

  const shareGlowUp = useCallback(async () => {
    if (!improvement || !result || sharing) return;
    setSharing(true);
    try {
      const afterPhoto = photoA.safeImage || photoA.rawImage;
      const blob = await buildGlowUpCardBlob(
        improvement.beforePhotoUrl, afterPhoto.dataUrl,
        improvement.beforeResult, result,
      );
      await shareBlob(blob, 'simdi-oldu.png', `Kombinim şimdi ${Math.round(result.puan)}/100.`);
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        setErrorMsg('Paylaşım kartı oluşturulamadı. Tekrar dener misin?');
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, shareBlob, improvement, result, photoA.safeImage, photoA.rawImage]);

  const noPhotoYet = !photoA.rawImage && !photoB.rawImage;

  return (
    <div className="min-h-screen w-full flex justify-center font-sans" style={{ background: C.bg }}>
      <div className="w-full stylist-wrap px-5 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="font-sans font-bold uppercase" style={{ fontSize: 11.5, letterSpacing: '0.12em', color: C.accent }}>
            Moda ve Stil Analizörü
          </div>
          <h1 className="font-display" style={{ fontSize: 36, fontWeight: 600, color: C.textPrimary, marginTop: 8, letterSpacing: '-0.01em' }}>
            Nasıl Olmuşum AI
          </h1>
          <p className="font-sans" style={{ fontSize: 15, color: C.textSecondary, marginTop: 10, lineHeight: 1.55 }}>
            Bir fotoğraf yükle; stil, renk uyumu ve mevsim uygunluğunu değerlendirip alternatif öneriler sunayım.
          </p>
        </div>

        {mode === 'single' && !photoA.rawImage && !improvement && <HistoryStrip history={history} onClear={clearHistory} />}

        {mode === 'single' && (
          !photoA.rawImage ? (
            <>
              {improvement && (
                <div className="flex items-center justify-between mb-5">
                  <p className="font-sans font-semibold" style={{ fontSize: 13.5, color: C.textSecondary }}>
                    Önce: <span style={{ color: C.textPrimary, fontWeight: 700 }}>{improvement.beforeResult.puan}/100</span>
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="press-btn font-sans"
                    style={{ fontSize: 12.5, color: C.textMuted, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    İptal
                  </button>
                </div>
              )}
              <PhotoSlot photo={photoA} />
              {status === 'error' && <ErrorBanner message={errorMsg} />}
              {noPhotoYet && !improvement && (
                <button
                  type="button"
                  onClick={() => switchMode('compare')}
                  className="press-btn font-sans"
                  style={{ fontSize: 13.5, color: C.textSecondary, background: 'none', border: 'none', padding: 0, marginTop: 20, cursor: 'pointer', textAlign: 'left' }}
                >
                  İki kombin arasında mı kaldın? <span style={{ color: C.accent, fontWeight: 700 }}>Hangisini Giyeyim? →</span>
                </button>
              )}
            </>
          ) : status === 'done' && result && improvement ? (
            <ImprovementResult
              beforeResult={improvement.beforeResult}
              beforePhotoUrl={improvement.beforePhotoUrl}
              afterResult={result}
              afterPhotoUrl={(photoA.safeImage || photoA.rawImage).dataUrl}
              onReset={reset}
              onShare={shareGlowUp}
              sharing={sharing}
            />
          ) : (
            <div className="stylist-layout">
              <div className="stylist-photo-col">
                {improvement && (
                  <p className="font-sans font-semibold mb-4" style={{ fontSize: 13.5, color: C.textSecondary }}>
                    Önce: <span style={{ color: C.textPrimary, fontWeight: 700 }}>{improvement.beforeResult.puan}/100</span>
                  </p>
                )}
                <PhotoSlot photo={photoA} locked={status === 'done'} />

                {status !== 'done' && <OccasionPicker occasion={occasion} onChange={setOccasion} />}

                {status !== 'done' && (
                  <button
                    onClick={analyze}
                    disabled={status === 'loading' || photoA.blurring || !photoA.safeImage}
                    className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold mb-8"
                    style={{
                      fontSize: 15.5, padding: '16px 16px', borderRadius: RADIUS.medium,
                      ...BUTTON.primary(status === 'loading' || photoA.blurring || !photoA.safeImage),
                    }}
                  >
                    {photoA.blurring ? (
                      'Fotoğraf hazırlanıyor…'
                    ) : status === 'loading' ? (
                      <>
                        <svg width="17" height="17" viewBox="0 0 16 16" className="spin-anim" style={{ animation: 'spin 0.8s linear infinite' }}>
                          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 20" strokeLinecap="round" opacity="0.85" />
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
                <div className="flex flex-col gap-9">
                  <div className="flex items-start gap-5">
                    <ScoreHoop puan={result.puan} />
                    <div style={{ paddingTop: 4 }}>
                      <p className="font-sans" style={{ fontSize: 16, color: C.textPrimary, lineHeight: 1.55, fontWeight: 500 }}>
                        {result.genel_izlenim}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const strongest = strongestCriterion(result.kriterler);
                    return strongest ? (
                      <div>
                        <hr className="hairline-divider mb-6" />
                        <div className="flex flex-col gap-4">
                          <SectionLabel>En Güçlü Taraf</SectionLabel>
                          <CriterionRow label={strongest.label} weight={strongest.weight} data={strongest.data} Icon={strongest.Icon} />
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div>
                    <hr className="hairline-divider mb-6" />
                    <div className="flex flex-col gap-4">
                      <SectionLabel>Bir Kademe Yukarı</SectionLabel>
                      <div className="flex flex-col gap-4">
                        {(result.oneriler || []).slice(0, 3).map((o, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span
                              className="font-sans font-bold flex items-center justify-center shrink-0 rounded-full"
                              style={{ width: 22, height: 22, fontSize: 11, color: C.accent, background: C.surface }}
                            >
                              {i + 1}
                            </span>
                            <p className="font-sans" style={{ fontSize: 14.5, color: C.textPrimary, lineHeight: 1.55, paddingTop: 1 }}>{o}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <hr className="hairline-divider mb-6" />
                    <div className="flex flex-col gap-4">
                      <SectionLabel>Puan Dağılımı</SectionLabel>
                      <div className="flex flex-col gap-5">
                        {CRITERIA.map((c) => (
                          <CriterionRow key={c.key} label={c.label} weight={c.weight} data={result.kriterler?.[c.key]} Icon={c.Icon} />
                        ))}
                      </div>
                      <ConfidenceBadge guven={result.guven} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={startImprovementLoop}
                      className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
                      style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.primary() }}
                    >
                      <RefreshCw size={16} /> Değiştirdim, tekrar bak
                    </button>

                    <button
                      onClick={() => shareResult(photoA.safeImage, result)}
                      disabled={sharing}
                      className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
                      style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.secondary(sharing) }}
                    >
                      <Share2 size={16} /> {sharing ? 'Kart hazırlanıyor…' : 'Sonucu Paylaş'}
                    </button>

                    <button
                      onClick={reset}
                      className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
                      style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.secondary() }}
                    >
                      <RefreshCw size={16} /> Başka Bir Kombin Dene
                    </button>
                  </div>
                </div>
                </div>
              )}
            </div>
          )
        )}

        {mode === 'compare' && (
          <div>
            {compareStatus !== 'done' && (
              <>
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, color: C.textPrimary }}>
                    Hangisini Giyeyim?
                  </h2>
                  {noPhotoYet && (
                    <button
                      type="button"
                      onClick={() => switchMode('single')}
                      className="press-btn font-sans font-semibold"
                      style={{ fontSize: 12.5, color: C.textSecondary, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      ‹ Geri
                    </button>
                  )}
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ minWidth: 0 }}>
                  <p className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.accent, marginBottom: 8, letterSpacing: '0.05em' }}>Kombin A</p>
                  <PhotoSlot photo={photoA} compact />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.accent, marginBottom: 8, letterSpacing: '0.05em' }}>Kombin B</p>
                  <PhotoSlot photo={photoB} compact />
                </div>
                </div>
              </>
            )}

            {compareStatus !== 'done' && (photoA.rawImage || photoB.rawImage) && (
              <div className="mt-6">
                <OccasionPicker occasion={occasion} onChange={setOccasion} />

                <button
                  onClick={compareAnalyze}
                  disabled={compareStatus === 'loading' || photoA.blurring || photoB.blurring || !photoA.safeImage || !photoB.safeImage}
                  className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
                  style={{
                    fontSize: 15.5, padding: '16px 16px', borderRadius: RADIUS.medium,
                    ...BUTTON.primary(compareStatus === 'loading' || photoA.blurring || photoB.blurring || !photoA.safeImage || !photoB.safeImage),
                  }}
                >
                  {compareStatus === 'loading' ? (
                    <>
                      <svg width="17" height="17" viewBox="0 0 16 16" className="spin-anim" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 20" strokeLinecap="round" opacity="0.85" />
                      </svg>
                      İkisi de inceleniyor…
                    </>
                  ) : (
                    <>İkisini Karşılaştır <ChevronRight size={16} /></>
                  )}
                </button>
                <p className="font-sans text-center" style={{ fontSize: 11.5, color: C.textMuted, marginTop: 10 }}>
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
                  <div className="text-center" style={{ background: C.surfaceSubtle, borderRadius: RADIUS.large, padding: 22 }}>
                    <SectionLabel>Sonuç</SectionLabel>
                    <p className="font-display" style={{ fontSize: 19, fontWeight: 600, color: C.textPrimary, marginTop: 8 }}>{verdict.text}</p>
                  </div>

                  <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {sides.map(({ label, photo, r }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-4"
                        style={{
                          minWidth: 0, borderRadius: RADIUS.large, padding: 18,
                          border: `1.5px solid ${verdict.winner === label ? C.accent : C.borderSubtle}`,
                        }}
                      >
                        <span className="font-sans font-bold uppercase" style={{ fontSize: 11, color: C.accent, letterSpacing: '0.05em' }}>
                          Kombin {label} {verdict.winner === label ? '· Kazanan' : ''}
                        </span>
                        <img
                          src={(photo.safeImage || photo.rawImage).dataUrl}
                          alt={`Kombin ${label}`}
                          className="w-full object-cover"
                          style={{ maxHeight: 220, borderRadius: RADIUS.medium }}
                        />
                        <div className="flex items-start gap-3" style={{ minWidth: 0 }}>
                          <ScoreHoop puan={r.puan} />
                          <p className="font-sans" style={{ fontSize: 13.5, color: C.textPrimary, lineHeight: 1.5, fontWeight: 500, paddingTop: 4, minWidth: 0 }}>
                            {r.genel_izlenim}
                          </p>
                        </div>
                        <button
                          onClick={() => shareResult(photo.safeImage, r)}
                          disabled={sharing}
                          className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
                          style={{ fontSize: 13, padding: '11px 14px', borderRadius: RADIUS.medium, ...BUTTON.secondary(sharing) }}
                        >
                          <Share2 size={13} /> Paylaş
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={shareBattle}
                    disabled={sharing}
                    className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
                    style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.primary(sharing) }}
                  >
                    <Share2 size={16} /> {sharing ? 'Kart hazırlanıyor…' : 'Karşılaştırmayı Paylaş'}
                  </button>

                  <button
                    onClick={resetCompare}
                    className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold"
                    style={{ fontSize: 14.5, padding: '15px 16px', borderRadius: RADIUS.medium, ...BUTTON.secondary() }}
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
