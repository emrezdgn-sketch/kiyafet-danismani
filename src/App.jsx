import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, RefreshCw, X, ChevronRight, Palette, Shirt, Ruler, Sun, Gem, Share2 } from 'lucide-react';

// Renkler CSS custom property olarak tanımlı (aşağıdaki :root / @media
// bloğunda) ki sistem karanlık moda geçtiğinde JS'te yeniden render
// gerekmeden, tarayıcı tek başına anlık geçiş yapabilsin.
const C = {
  bg: 'var(--bg)',
  ink: 'var(--ink)',
  inkSoft: 'var(--ink-soft)',
  inkFaint: 'var(--ink-faint)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  // Marka rengi olan accent'ten kasıtlı olarak ayrı: hata durumları
  // "kombin puanı düşük" ile karışmasın diye net bir kırmızı kullanıyor.
  danger: 'var(--danger)',
  line: 'var(--line)',
};

// Neomorfizm: kart ve sayfa AYNI zemin renginde — derinlik yalnızca çift
// yönlü (koyu + açık) yumuşak gölgeyle oluşturuluyor, renk farkıyla değil.
// Gölge renkleri de değişkene bağlı: karanlık modda "aydınlık" gölge çok
// hafif bir parıltıya, "koyu" gölge ise saf siyaha yaklaşır.
const SHADOW = {
  raised: '9px 9px 20px var(--shadow-d1), -9px -9px 20px var(--shadow-l1)',
  raisedSm: '5px 5px 12px var(--shadow-d2), -5px -5px 12px var(--shadow-l2)',
  inset: 'inset 5px 5px 11px var(--shadow-d2), inset -5px -5px 11px var(--shadow-l2)',
  accent: '7px 7px 16px var(--shadow-ad), -5px -5px 14px var(--shadow-al)',
};

// Styles moved to src/index.css (Tailwind + custom CSS)

// System prompt is now server-side (proxy/worker.js) — the client only
// sends image data + optional occasion hint.

// 5 ağırlıklı değerlendirme kriteri — sıra, ağırlıklar ve ikonlar burada
// sabit, model sadece her biri için puan ve kısa gerekçe döndürür.
const CRITERIA = [
  { key: 'color_palette', label: 'Renk Paleti', weight: 30, Icon: Palette },
  { key: 'style_cohesion', label: 'Stil Bütünlüğü', weight: 25, Icon: Shirt },
  { key: 'fit_and_silhouette', label: 'Silüet ve Oran', weight: 20, Icon: Ruler },
  { key: 'seasonal_suitability', label: 'Mevsim Uyumu', weight: 15, Icon: Sun },
  { key: 'accessories', label: 'Aksesuar Detayları', weight: 10, Icon: Gem },
];

// Geçmiş değerlendirmeler yalnızca bu cihazda (localStorage) saklanır,
// hiçbir yere gönderilmez; kullanıcı zaman içindeki puan değişimini görebilsin
// diye küçük bir kare önizleme + puan tutulur, tam çözünürlüklü görsel değil.
const HISTORY_KEY = 'nasilOlmusumHistory:v1';
const HISTORY_LIMIT = 12;
const THUMB_SIZE = 72;

function loadHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // localStorage dolu ya da erişilemez olabilir (gizli sekme vb.);
    // sessizce yut — geçmiş bu oturumda kalıcı olmaz ama uygulama çalışır.
  }
}

function makeThumbnail(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = THUMB_SIZE;
        canvas.height = THUMB_SIZE;
        canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      resolve({ dataUrl, base64: dataUrl.split(',')[1], mediaType: file.type });
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

// Claude görsel girdisini dahili olarak ~1568px uzun kenara indirger; bunun
// üzerinde göndermek sadece yükleme süresini ve tarayıcı belleğini artırır,
// analiz kalitesine katkısı olmaz. Burada aynı sınıra önceden indiriyoruz.
const MAX_IMAGE_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

function applyFaceBlur(dataUrl, mediaType, centerX, centerY, radius) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
        const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);
        // Dikdörtgen bant yerine merkezden tutup taşınabilen, yeniden
        // boyutlandırılabilen dairesel bir alan: sadece yüzü kapsayacak
        // kadar küçültülüp tam üzerine getirilebilir.
        if (radius > 0) {
          const cx = targetW * centerX;
          const cy = targetH * centerY;
          const r = radius * targetW;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip();
          // Küçültülmüş görsel üzerinde çalıştığı için blur maliyeti de düşer.
          ctx.filter = 'blur(18px)';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          ctx.restore();
        }
        // Fotoğraflar için JPEG, PNG'ye göre çok daha küçük dosya üretir ve
        // yükleme hızını belirgin şekilde artırır; kalite kaybı analizde
        // fark edilmez.
        const outUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve({ dataUrl: outUrl, base64: outUrl.split(',')[1], mediaType: 'image/jpeg' });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Görsel işlenemedi'));
    img.src = dataUrl;
  });
}

// Puan aralıkları prompt'taki puanlama kuralıyla birebir eşleşiyor —
// arayüzdeki etiket ile modelin uyguladığı ölçüt her zaman tutarlı kalsın diye.
const SCORE_TIERS = [
  { max: 40, label: 'Sorunlu', color: C.accent },
  { max: 60, label: 'Vasat', color: C.warning },
  { max: 80, label: 'İyi', color: C.warning },
  { max: 92, label: 'Başarılı', color: C.success },
  { max: 100, label: 'Kusursuz', color: C.success },
];
function scoreTier(p) {
  return SCORE_TIERS.find((t) => p <= t.max) || SCORE_TIERS[SCORE_TIERS.length - 1];
}
// Dairenin çevresi 251 (2πr, r=40) birim.
const RING_CIRCUMFERENCE = 251;

// Paylaşım kartı sabit renkler kullanır (CSS değişkeni değil): canvas
// bağlamı `var(--accent)` gibi ifadeleri çözemez, ayrıca kart Instagram/
// WhatsApp gibi harici yerlerde açılacağı için görüntüleyenin cihaz temasından
// bağımsız, her zaman aynı marka görünümünde olmalı.
const SHARE_PALETTE = {
  bg: '#F5F0E6', ink: '#2B251E', inkSoft: '#75695A', inkFaint: '#A89C89',
  accent: '#B5563D', success: '#4C7A5E', warning: '#BE8A34', line: '#E6DECF',
};
function shareTierColor(p) {
  if (p <= 40) return SHARE_PALETTE.accent;
  if (p <= 80) return SHARE_PALETTE.warning;
  return SHARE_PALETTE.success;
}

function drawCoverImage(ctx, img, iw, ih, dx, dy, dw, dh) {
  const ir = iw / ih;
  const dr = dw / dh;
  let sx, sy, sw, sh;
  if (ir > dr) { sh = ih; sw = sh * dr; sx = (iw - sw) / 2; sy = 0; }
  else { sw = iw; sh = sw / dr; sx = 0; sy = (ih - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    let last = truncated[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    truncated[maxLines - 1] = `${last.replace(/\s+$/, '')}…`;
    return truncated;
  }
  return lines;
}

const SHARE_CARD_W = 1080;
const SHARE_CARD_H = 1350;
const SHARE_PHOTO_H = 760;

function drawShareCard(ctx, img, iw, ih, result) {
  ctx.fillStyle = SHARE_PALETTE.bg;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);
  drawCoverImage(ctx, img, iw, ih, 0, 0, SHARE_CARD_W, SHARE_PHOTO_H);

  const p = Math.max(0, Math.min(100, Number(result.puan) || 0));
  const tColor = shareTierColor(p);
  const tLabel = scoreTier(p).label.toLocaleUpperCase('tr-TR');

  const badgeR = 92;
  const badgeCx = SHARE_CARD_W - 140, badgeCy = SHARE_PHOTO_H;
  ctx.save();
  ctx.shadowColor = 'rgba(43,37,30,0.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = SHARE_PALETTE.bg;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 14;
  ctx.strokeStyle = SHARE_PALETTE.line;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR - 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = tColor;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR - 18, -Math.PI / 2, -Math.PI / 2 + (p / 100) * Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = SHARE_PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 56px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(String(p), badgeCx, badgeCy - 6);
  ctx.fillStyle = SHARE_PALETTE.inkFaint;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('/100', badgeCx, badgeCy + 30);

  const padX = 64;
  let y = SHARE_PHOTO_H + 90;

  ctx.textAlign = 'left';
  ctx.fillStyle = SHARE_PALETTE.accent;
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NASIL OLMUŞUM AI', padX, y);

  y += 60;
  ctx.fillStyle = tColor;
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(tLabel, padX, y);

  y += 56;
  ctx.fillStyle = SHARE_PALETTE.ink;
  ctx.font = '500 38px "Plus Jakarta Sans", sans-serif';
  const lines = wrapLines(ctx, result.genel_izlenim || '', SHARE_CARD_W - padX * 2, 4);
  const lineHeight = 50;
  lines.forEach((line, i) => ctx.fillText(line, padX, y + i * lineHeight));

  ctx.fillStyle = SHARE_PALETTE.inkFaint;
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('danismanik.pages.dev', padX, SHARE_CARD_H - 48);
}

function buildShareCardBlob(imgDataUrl, result) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const canvas = document.createElement('canvas');
        canvas.width = SHARE_CARD_W;
        canvas.height = SHARE_CARD_H;
        const ctx = canvas.getContext('2d');
        drawShareCard(ctx, img, img.naturalWidth, img.naturalHeight, result);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob); else reject(new Error('Kart oluşturulamadı'));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    img.src = imgDataUrl;
  });
}

function ScoreHoop({ puan }) {
  const p = Math.max(0, Math.min(100, Number(puan) || 0));
  const tier = scoreTier(p);
  return (
    <div className="flex flex-col items-center gap-2.5 shrink-0">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: 108, height: 108, background: C.bg, boxShadow: SHADOW.raised }}
      >
        <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="44" cy="44" r="38" fill="none" stroke={C.line} strokeWidth="7" />
          <circle
            cx="44" cy="44" r="38" fill="none" stroke={tier.color} strokeWidth="7"
            strokeDasharray={`${(p / 100) * (2 * Math.PI * 38)} ${2 * Math.PI * 38}`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute font-sans flex flex-col items-center" style={{ color: C.ink, lineHeight: 1 }}>
          <span style={{ fontSize: 26, fontWeight: 800 }}>{p}</span>
          <span className="font-sans" style={{ fontSize: 10, color: C.inkFaint, marginTop: 2, fontWeight: 600 }}>/100</span>
        </div>
      </div>
      <span
        className="font-sans"
        style={{
          fontSize: 11.5, letterSpacing: '0.04em', color: tier.color, fontWeight: 700,
          background: C.bg, boxShadow: SHADOW.raisedSm, padding: '4px 12px', borderRadius: 999,
        }}
      >
        {tier.label}
      </span>
    </div>
  );
}

function CriterionRow({ label, weight, data, Icon }) {
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

const GUVEN_ACIKLAMA = 'Güven, bu değerlendirmenin ne kadar isabetli olabileceğini gösterir; fotoğrafın netliği, ışığı, çekim açısı ve kombinin ne kadarının net görünmesine bağlı olarak belirlenir. Yüksek güven, değerlendirmenin daha sağlam bir gözleme dayandığı anlamına gelir.';

function ConfidenceBadge({ guven }) {
  const [open, setOpen] = useState(false);
  if (!guven || !guven.seviye) return null;
  const level = String(guven.seviye).toLowerCase();
  const tone = level === 'yüksek' ? C.success : level === 'orta' ? C.warning : C.accent;
  const tooltip = guven.neden ? `${GUVEN_ACIKLAMA} Bu değerlendirmede: ${guven.neden}` : GUVEN_ACIKLAMA;
  return (
    <div
      className="relative inline-flex items-center gap-1.5 font-sans"
      style={{ fontSize: 12, fontWeight: 600, color: tone, marginTop: 6 }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: tone, display: 'inline-block' }} />
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
          width: 15, height: 15, borderRadius: 999, background: C.bg, boxShadow: SHADOW.raisedSm,
          color: tone, fontSize: 10, fontWeight: 700,
          cursor: 'pointer', marginLeft: 1, lineHeight: 1, border: 'none', padding: 0,
        }}
      >
        i
      </button>
      {open && (
        <div
          className="font-sans"
          style={{
            // Kasıtlı olarak sabit renkler: tema koyu moda geçse bile bu
            // ipucu her zaman koyu zemin + krem yazı olarak kalır — C.ink
            // karanlık modda krem rengine döndüğü için buraya bağlanamaz.
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

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="font-sans mb-8 px-4 py-3 rounded-2xl"
      style={{ fontSize: 13.5, color: C.danger, background: C.bg, boxShadow: SHADOW.inset, fontWeight: 500 }}
      role="alert"
    >
      {message}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="font-sans font-bold uppercase" style={{ fontSize: 12.5, letterSpacing: '0.08em', color: C.ink }}>
      {children}
    </div>
  );
}

function HistoryStrip({ history, onClear }) {
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

const DEFAULT_BLUR_CENTER_X = 0.5;
const DEFAULT_BLUR_CENTER_Y = 0.16;
const DEFAULT_BLUR_RADIUS = 0.18;
const MIN_BLUR_RADIUS = 0.06;
const MAX_BLUR_RADIUS = 0.5;

// Tek bir fotoğrafın yükleme + yüz bulanıklaştırma + tutamaç sürükleme
// mantığının tamamını kapsar. Tek-kombin akışı ve karşılaştırma akışındaki
// iki yuva (A/B) bu hook'un birer bağımsız örneğini kullanır; böylece aynı
// karmaşık sürükleme/klavye mantığı tek yerde yaşar.
function usePhotoEditor() {
  const [rawImage, setRawImage] = useState(null); // never sent anywhere, kept only in this browser tab
  const [safeImage, setSafeImage] = useState(null); // face-blurred version, this is what gets uploaded
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(true);
  const [blurCenterX, setBlurCenterX] = useState(DEFAULT_BLUR_CENTER_X);
  const [blurCenterY, setBlurCenterY] = useState(DEFAULT_BLUR_CENTER_Y);
  const [blurRadius, setBlurRadius] = useState(DEFAULT_BLUR_RADIUS);
  const [blurring, setBlurring] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const photoRef = useRef(null);
  const activeHandleRef = useRef(null); // 'move' | 'resize' | null
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, centerX: 0, centerY: 0 });
  const blurCenterXRef = useRef(DEFAULT_BLUR_CENTER_X);
  const blurCenterYRef = useRef(DEFAULT_BLUR_CENTER_Y);
  const blurRadiusRef = useRef(DEFAULT_BLUR_RADIUS);
  const dragDepthRef = useRef(0);

  useEffect(() => { blurCenterXRef.current = blurCenterX; }, [blurCenterX]);
  useEffect(() => { blurCenterYRef.current = blurCenterY; }, [blurCenterY]);
  useEffect(() => { blurRadiusRef.current = blurRadius; }, [blurRadius]);

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLoadError('Bu bir resim dosyası değil. Lütfen JPEG, PNG veya HEIC formatında bir fotoğraf seçin.');
      return;
    }
    try {
      const img = await fileToImage(file);
      setRawImage(img);
      setBlurCenterX(DEFAULT_BLUR_CENTER_X);
      setBlurCenterY(DEFAULT_BLUR_CENTER_Y);
      setBlurRadius(DEFAULT_BLUR_RADIUS);
      setFaceBlurEnabled(true);
      setLoadError('');
    } catch {
      setLoadError('Fotoğraf yüklenemedi. Farklı bir fotoğrafla tekrar dener misin?');
    }
  }, []);

  const onPick = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    loadFile(file);
  }, [loadFile]);

  // Sürükle-bırak: nested elemanlar arasında dragenter/dragleave sık tetiklendiği
  // için sayaç kullanıyoruz, aksi halde bölge çocuk elemana girer girmez
  // "dragging" durumu titreşerek kapanıp açılır.
  const onZoneDragEnter = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }, []);
  const onZoneDragOver = useCallback((e) => { e.preventDefault(); }, []);
  const onZoneDragLeave = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }, []);
  const onZoneDrop = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  }, [loadFile]);

  useEffect(() => {
    if (!rawImage) {
      setSafeImage(null);
      return;
    }
    let cancelled = false;
    // Sürükleme sırasında blurCenterX/Y/blurRadius çok sık değişir; her
    // değişimde tam çözünürlükte canvas + blur + toDataURL çalıştırmak
    // yerine, sürükleme bittikten kısa süre sonra tek sefer hesaplıyoruz.
    const isDragging = !!activeHandleRef.current;
    setBlurring(true);
    const delay = isDragging ? 120 : 0;
    const timer = setTimeout(() => {
      applyFaceBlur(
        rawImage.dataUrl, rawImage.mediaType,
        blurCenterX, blurCenterY, faceBlurEnabled ? blurRadius : 0
      )
        .then((res) => { if (!cancelled) setSafeImage(res); })
        .catch(() => { if (!cancelled) setLoadError('Fotoğraf işlenemedi. Tekrar dener misin?'); })
        .finally(() => { if (!cancelled) setBlurring(false); });
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [rawImage, faceBlurEnabled, blurCenterX, blurCenterY, blurRadius]);

  // Daire merkezden tutup taşınabilir ('move') veya kenarından tutup
  // yeniden boyutlandırılabilir ('resize'). Hangisinin sürüklendiği
  // activeHandleRef'te tutulur; taşımada sürüklemenin başındaki merkez
  // konumuna göre bir ofset uygulanır ki tutamaç aniden imlecin altına
  // zıplamasın.
  const updateHandleFromPointer = useCallback((clientX, clientY) => {
    const el = photoRef.current;
    const handle = activeHandleRef.current;
    if (!el || !handle) return;
    const rect = el.getBoundingClientRect();
    const start = dragStartRef.current;
    if (handle === 'move') {
      const dx = (clientX - start.pointerX) / rect.width;
      const dy = (clientY - start.pointerY) / rect.height;
      setBlurCenterX(Math.max(0, Math.min(1, start.centerX + dx)));
      setBlurCenterY(Math.max(0, Math.min(1, start.centerY + dy)));
    } else {
      // Yarıçap genişliğin bir kesri olarak tanımlı (dairenin her iki eksende
      // de eşit görünmesini sağlayan CSS aspect-ratio hilesiyle tutarlı); bu
      // yüzden tutamacı yatayda ne kadar sürüklediğine bakıyoruz.
      const r = Math.abs((clientX - rect.left) / rect.width - blurCenterXRef.current);
      setBlurRadius(Math.max(MIN_BLUR_RADIUS, Math.min(MAX_BLUR_RADIUS, r)));
    }
  }, []);

  const onHandleDragStart = useCallback((handle) => (e) => {
    e.stopPropagation();
    activeHandleRef.current = handle;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      pointerX: clientX, pointerY: clientY,
      centerX: blurCenterXRef.current, centerY: blurCenterYRef.current,
    };
    updateHandleFromPointer(clientX, clientY);
  }, [updateHandleFromPointer]);

  const onHandleDragMove = useCallback((e) => {
    if (!activeHandleRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    updateHandleFromPointer(clientX, clientY);
  }, [updateHandleFromPointer]);

  const onHandleDragEnd = useCallback(() => { activeHandleRef.current = null; }, []);

  // Fare/dokunma olmadan da (klavye ile) tutamaçlar kullanılabilsin diye:
  // odaklanmış tutamaç üzerinde ok tuşları merkezi taşır ya da yarıçapı
  // değiştirir. Shift basılıyken adım büyür (hızlı kaba ayar için).
  const onHandleKeyDown = useCallback((handle) => (e) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    if (handle === 'move') {
      if (e.key === 'ArrowLeft') setBlurCenterX((x) => Math.max(0, x - step));
      else if (e.key === 'ArrowRight') setBlurCenterX((x) => Math.min(1, x + step));
      else if (e.key === 'ArrowUp') setBlurCenterY((y) => Math.max(0, y - step));
      else if (e.key === 'ArrowDown') setBlurCenterY((y) => Math.min(1, y + step));
      else return;
    } else {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        setBlurRadius((r) => Math.max(MIN_BLUR_RADIUS, r - step));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        setBlurRadius((r) => Math.min(MAX_BLUR_RADIUS, r + step));
      } else return;
    }
    e.preventDefault();
  }, []);

  const reset = useCallback(() => {
    setRawImage(null);
    setSafeImage(null);
    setLoadError('');
  }, []);

  return {
    rawImage, safeImage, faceBlurEnabled, setFaceBlurEnabled,
    blurCenterX, blurCenterY, blurRadius, blurring, loadError,
    isDragOver, photoRef, activeHandleRef,
    loadFile, onPick, onZoneDragEnter, onZoneDragOver, onZoneDragLeave, onZoneDrop,
    onHandleDragStart, onHandleDragMove, onHandleDragEnd, onHandleKeyDown,
    reset,
  };
}

// Bağlam/occasion seçimi: modelin değerlendirmeyi hangi ortam için
// kalibre edeceğini belirtir. Seçilmezse (null) eskisi gibi bağlamsız,
// genel bir değerlendirme yapılır — geriye dönük uyumlu varsayılan.
const OCCASIONS = [
  { key: 'gunluk', label: 'Günlük', hint: 'Bu kombin günlük, sıradan bir gün için düşünülmüş. Rahatlık ve günlük şıklık standartlarına göre değerlendir.' },
  { key: 'is', label: 'İş / Toplantı', hint: 'Bu kombin iş ortamı veya resmi bir toplantı için düşünülmüş. Ciddiyet, düzen ve profesyonellik standartlarına göre her zamankinden biraz daha sıkı değerlendir.' },
  { key: 'davet', label: 'Özel Davet', hint: 'Bu kombin özel bir davet veya özel bir gün için düşünülmüş. Şıklık ve özenin daha yüksek bir standartta olmasını bekle.' },
  { key: 'randevu', label: 'Randevu', hint: 'Bu kombin bir buluşma/randevu için düşünülmüş. Çekicilik ile özenli bir sadelik dengesini gözet.' },
];

function OccasionPicker({ occasion, onChange }) {
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

// Bir fotoğraf yuvasının tamamı: boşken sürükle-bırak/kamera/galeri
// alanı, doluyken yüz bulanıklaştırma tutamaçlı önizleme kartı. Tek-kombin
// akışında ve karşılaştırma modunun iki yuvasında (A/B) aynen kullanılır;
// `compact` karşılaştırma modunun dar iki-sütun düzeni için daha küçük
// bir görünüm üretir.
function PhotoSlot({ photo, compact, locked }) {
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  if (!photo.rawImage) {
    return (
      <div>
        <div
          role="button"
          tabIndex={0}
          aria-label="Kombin fotoğrafı yükle: sürükleyip bırakın veya seçin"
          onClick={() => galleryRef.current && galleryRef.current.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              galleryRef.current && galleryRef.current.click();
            }
          }}
          onDragEnter={photo.onZoneDragEnter}
          onDragOver={photo.onZoneDragOver}
          onDragLeave={photo.onZoneDragLeave}
          onDrop={photo.onZoneDrop}
          className={`flex flex-col items-center justify-center text-center cursor-pointer rounded-3xl ${compact ? 'px-4 py-10' : 'px-6 py-20'}`}
          style={{
            background: C.bg,
            boxShadow: photo.isDragOver ? SHADOW.raised : SHADOW.inset,
            border: `2px dashed ${photo.isDragOver ? C.accent : C.line}`,
            transform: photo.isDragOver ? 'scale(1.01)' : 'scale(1)',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <div
            className={compact ? 'rounded-full flex items-center justify-center mb-3' : 'rounded-full flex items-center justify-center mb-5'}
            style={{
              width: compact ? 52 : 72, height: compact ? 52 : 72, background: C.bg,
              boxShadow: photo.isDragOver ? SHADOW.accent : SHADOW.raised,
              color: C.accent,
              transform: photo.isDragOver ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <Upload size={compact ? 20 : 28} strokeWidth={1.6} />
          </div>
          <p className="font-sans font-bold" style={{ fontSize: compact ? 14.5 : 19, color: C.ink, marginBottom: compact ? 4 : 8 }}>
            {photo.isDragOver ? 'Bırakın…' : 'Fotoğrafı sürükleyin'}
          </p>
          {!compact && (
            <p className="font-sans" style={{ fontSize: 14.5, color: C.inkSoft, marginBottom: 24, maxWidth: 300 }}>
              Kombinin net görünen, tam boy veya üst gövde fotoğrafı en iyi sonucu verir.
            </p>
          )}
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => cameraRef.current && cameraRef.current.click()}
              className="press-btn flex items-center gap-2 font-sans font-semibold rounded-2xl"
              style={{ fontSize: compact ? 12.5 : 14, color: C.ink, background: C.bg, boxShadow: SHADOW.raisedSm, padding: compact ? '9px 12px' : '12px 18px' }}
            >
              <Camera size={compact ? 14 : 17} /> {compact ? 'Çek' : 'Fotoğraf Çek'}
            </button>
            <button
              onClick={() => galleryRef.current && galleryRef.current.click()}
              className="press-btn flex items-center gap-2 font-sans font-semibold rounded-2xl"
              style={{ fontSize: compact ? 12.5 : 14, color: '#FFFFFF', background: C.accent, boxShadow: SHADOW.accent, padding: compact ? '9px 12px' : '12px 18px' }}
            >
              <Upload size={compact ? 14 : 17} /> {compact ? 'Seç' : 'Galeriden Seç'}
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={photo.onPick} className="hidden" />
          <input ref={galleryRef} type="file" accept="image/*" onChange={photo.onPick} className="hidden" />
          {!compact && (
            <p className="font-sans" style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 20, maxWidth: 300, lineHeight: 1.6 }}>
              Yüzün otomatik olarak bulanıklaştırılır; orijinal fotoğraf hiçbir yere gönderilmez, sadece bulanıklaştırılmış hâli kıyafet analizi için paylaşılır.
            </p>
          )}
        </div>
        {photo.loadError && <ErrorBanner message={photo.loadError} />}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={photo.photoRef}
        className={compact ? 'relative overflow-hidden select-none rounded-3xl mb-3' : 'relative overflow-hidden select-none rounded-3xl mb-5'}
        style={{ background: C.bg, boxShadow: SHADOW.raised, padding: 12, touchAction: (photo.faceBlurEnabled && !locked) ? 'none' : 'auto' }}
        onMouseMove={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragMove : undefined}
        onMouseUp={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragEnd : undefined}
        onMouseLeave={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragEnd : undefined}
        onTouchMove={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragMove : undefined}
        onTouchEnd={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragEnd : undefined}
      >
        <img
          src={(photo.safeImage || photo.rawImage).dataUrl}
          alt="Yüklenen kombin (yüz bulanıklaştırılmış önizleme)"
          className={compact ? 'w-full object-cover block' : 'w-full object-cover block stylist-photo-img'}
          style={{ borderRadius: 18, opacity: photo.blurring ? 0.6 : 1, maxHeight: compact ? 320 : undefined }}
          draggable={false}
        />
        {photo.faceBlurEnabled && !locked && (
          <>
            {/* Bulanıklaştırılan daireyi görünür kılan gölge — width %
                + aspect-ratio:1 + translate(-50%,-50%) ile fotoğrafın
                en/boy oranından bağımsız olarak her zaman tam daire. */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `calc(12px + ${photo.blurCenterX} * (100% - 24px))`,
                top: `calc(12px + ${photo.blurCenterY} * (100% - 24px))`,
                width: `calc(${photo.blurRadius * 2} * (100% - 24px))`,
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: 'rgba(var(--accent-rgb), 0.10)',
                border: `2px dashed ${C.accent}`,
              }}
            />
            {/* Merkez tutamacı — tutup taşımak için (klavyeyle de: odaklan + ok tuşları) */}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Bulanıklaştırma alanını taşı"
              aria-valuetext={`Yatay %${Math.round(photo.blurCenterX * 100)}, dikey %${Math.round(photo.blurCenterY * 100)}`}
              className="absolute flex items-center justify-center press-icon"
              style={{
                left: `calc(12px + ${photo.blurCenterX} * (100% - 24px))`,
                top: `calc(12px + ${photo.blurCenterY} * (100% - 24px))`,
                width: 40, height: 40, transform: 'translate(-50%, -50%)',
                cursor: photo.activeHandleRef.current === 'move' ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onMouseDown={photo.onHandleDragStart('move')}
              onTouchStart={photo.onHandleDragStart('move')}
              onKeyDown={photo.onHandleKeyDown('move')}
            >
              <div
                style={{
                  width: 15, height: 15, borderRadius: 999, background: C.accent,
                  border: '2px solid #FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              />
            </div>
            {/* Kenar tutamacı — sürükleyip yarıçapı değiştirmek için (klavyeyle de) */}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Bulanıklaştırma alanının boyutu"
              aria-valuetext={`Yarıçap %${Math.round(photo.blurRadius * 100)}`}
              className="absolute flex items-center justify-center cursor-ew-resize press-icon"
              style={{
                left: `calc(12px + ${photo.blurCenterX + photo.blurRadius} * (100% - 24px))`,
                top: `calc(12px + ${photo.blurCenterY} * (100% - 24px))`,
                width: 22, height: 22, transform: 'translate(-50%, -50%)',
                touchAction: 'none',
              }}
              onMouseDown={photo.onHandleDragStart('resize')}
              onTouchStart={photo.onHandleDragStart('resize')}
              onKeyDown={photo.onHandleKeyDown('resize')}
            >
              <div
                style={{
                  width: 13, height: 13, borderRadius: 999, background: '#FFFFFF',
                  border: `2px solid ${C.accent}`, boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          </>
        )}
        {!locked && (
          <button
            onClick={photo.reset}
            className="press-icon press-btn absolute flex items-center justify-center rounded-full"
            style={{ top: compact ? 14 : 24, right: compact ? 14 : 24, width: 32, height: 32, background: C.bg, color: C.ink, boxShadow: SHADOW.raisedSm }}
            aria-label="Fotoğrafı kaldır"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {!locked && (
        <label className={compact ? 'flex items-center gap-2 mb-2 font-sans' : 'flex items-center gap-2.5 mb-6 font-sans'} style={{ fontSize: compact ? 12 : 13, color: C.inkSoft, fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={photo.faceBlurEnabled}
            onChange={(e) => photo.setFaceBlurEnabled(e.target.checked)}
            style={{ accentColor: C.accent, width: 16, height: 16 }}
          />
          Yüzümü bulanıklaştır {!compact && <span style={{ color: C.inkFaint, fontWeight: 400 }}>(ortadan taşı, kenardan boyutlandır)</span>}
        </label>
      )}
      {photo.loadError && <ErrorBanner message={photo.loadError} />}
    </div>
  );
}

// analyze() ve compareAnalyze() aynı API çağrısını yapar; tek yerde tutmak
// iki akışın davranışının (hata mesajları, JSON ayrıştırma vb.) birbirinden
// sapmasını önler.
async function runAnalysis(safeImage, occasion) {
  if (!API_PROXY_URL) {
    throw new Error('Proxy adresi ayarlanmamış. .env dosyasında VITE_API_PROXY_URL tanımlayın.');
  }
  const response = await fetch(API_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: { base64: safeImage.base64, media_type: safeImage.mediaType },
      occasion: occasion ? occasion.hint : undefined,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'API hatası');
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Boş yanıt');
  if (data.stop_reason === 'max_tokens') {
    throw new Error('Yanıt yarıda kesildi (max_tokens sınırı)');
  }
  const clean = textBlock.text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON ayrıştırılamadı');
    return JSON.parse(match[0]);
  }
}

function compareVerdict(a, b) {
  const pa = Math.round(Number(a.puan) || 0);
  const pb = Math.round(Number(b.puan) || 0);
  if (pa === pb) return { winner: null, text: `Başa baş: ikisi de ${pa}/100 ile eşit güçlü.` };
  const winner = pa > pb ? 'A' : 'B';
  const diff = Math.abs(pa - pb);
  return { winner, text: `${winner} kombini daha başarılı (${diff} puan fark).` };
}

// Anthropic anahtarı ve model adı, kaynak koduna gömülmek yerine index.html
// tarafından önceden yüklenen config.js dosyasından okunur (bkz. config.example.js).
const API_PROXY_URL = import.meta.env.VITE_API_PROXY_URL || (typeof window !== 'undefined' && window.APP_CONFIG?.apiProxyUrl) || '';

export default function OutfitStylist() {
  // Tek-kombin akışı hep "A" yuvasını kullanır; karşılaştırma modunda
  // "B" yuvası da devreye girer. İki hook'u da koşulsuz çağırmak (React'ın
  // hook kuralı gereği) ve hangisinin gösterileceğine sadece JSX'te karar
  // vermek, mode değişince state kaybı/karmaşası olmadan en temiz yol.
  const photoA = usePhotoEditor();
  const photoB = usePhotoEditor();
  const [mode, setMode] = useState('single'); // 'single' | 'compare'
  const [occasion, setOccasion] = useState(null);

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [compareStatus, setCompareStatus] = useState('idle');
  const [compareResult, setCompareResult] = useState(null); // { a, b }

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

  // İki kombini karşılaştırma: iki bağımsız (aynı system prompt'u paylaşan,
  // dolayısıyla önbellekten faydalanabilen) analiz isteği paralel atılır.
  // Bu, tek-kombin değerlendirmesinin birebir iki katı — kullanıcıya bunu
  // arayüzde açıkça belirtiyoruz (bkz. "Karşılaştır" butonu).
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

  // Sonuç geldiğinde, özellikle mobilde skor kartı ekranın dışında kalabiliyor;
  // kullanıcı "tıklama işe yaradı mı?" diye tereddüt etmesin diye sonuca kaydır.
  useEffect(() => {
    if (((status === 'done' && result) || (compareStatus === 'done' && compareResult)) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status, result, compareStatus, compareResult]);

  // Bölgenin dışına bırakılan bir dosya olursa tarayıcı sekmeyi o dosyayla
  // değiştirmeye çalışır; bunu tüm sayfada engelliyoruz.
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
        // Web Share API'yi (özellikle dosyalarla) desteklemeyen tarayıcılarda
        // (çoğu masaüstü tarayıcı) karta indirme bağlantısı olarak düş.
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
      // Kullanıcı paylaşım sayfasını iptal ettiğinde de AbortError fırlar —
      // bu bir hata değil, sessizce yut.
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

        {/* Mod seçimi: bir fotoğraf yüklenmeye başlanınca karışıklık
            olmaması için gizlenir; değiştirmek isteyen "Yeniden Başla"ya
            benzer bir sıfırlamadan geçmiş olur. */}
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

              {/* Results */}
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

