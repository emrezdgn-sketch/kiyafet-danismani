import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Upload, RefreshCw, X, ChevronRight, Palette, Shirt, Ruler, Sun, Gem, Watch } from 'lucide-react';

const C = {
  bg: '#F5F0E6',
  ink: '#2B251E',
  inkSoft: '#75695A',
  inkFaint: '#A89C89',
  accent: '#B5563D',
  success: '#4C7A5E',
  warning: '#BE8A34',
  line: '#E6DECF',
};

// Neomorfizm: kart ve sayfa AYNI zemin renginde — derinlik yalnızca çift
// yönlü (koyu + açık) yumuşak gölgeyle oluşturuluyor, renk farkıyla değil.
const SHADOW = {
  raised: '9px 9px 20px rgba(43,37,30,0.12), -9px -9px 20px rgba(255,255,255,0.9)',
  raisedSm: '5px 5px 12px rgba(43,37,30,0.10), -5px -5px 12px rgba(255,255,255,0.85)',
  inset: 'inset 5px 5px 11px rgba(43,37,30,0.10), inset -5px -5px 11px rgba(255,255,255,0.8)',
  accent: '7px 7px 16px rgba(181,86,61,0.32), -5px -5px 14px rgba(255,255,255,0.5)',
};

const STYLES = (
  <style>{`
    .font-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .spin-anim { animation: none !important; }
      .press-btn { transition: none !important; }
    }
    .stylist-wrap { max-width: 540px; margin: 0 auto; }
    .stylist-layout { display: flex; flex-direction: column; gap: 28px; }
    .stylist-photo-col { width: 100%; }
    .stylist-results-col { width: 100%; }
    .stylist-photo-img { max-height: 480px; }
    @media (min-width: 760px) {
      .stylist-wrap { max-width: 1100px; }
      .stylist-layout { flex-direction: row; align-items: flex-start; gap: 44px; }
      .stylist-photo-col { width: 400px; flex-shrink: 0; position: sticky; top: 28px; }
      .stylist-results-col { flex: 1; min-width: 0; }
      .stylist-photo-img { max-height: 620px; }
    }
    .press-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
    .press-btn:hover { transform: translateY(-2px); }
    .press-btn:active { transform: translateY(0) scale(0.99); }
    .press-btn:disabled { transform: none; cursor: default; }
    .press-btn:focus-visible, .press-icon:focus-visible {
      outline: 2px solid ${C.accent}; outline-offset: 2px; border-radius: 4px;
    }
    .press-icon { transition: transform 0.15s ease; }
    .press-icon:hover { transform: scale(1.08); }
    .idea-card:hover { transform: translateY(-2px); }
  `}</style>
);

const PROMPT = `Eski usul, çok titiz ve kusur bulmakta asla çekinmeyen bir görgü öğretmeni / mürebbiyesin — Heidi çizgi filmindeki katı, disiplinli dadı karakterini düşün. Nezaket, düzen, özen ve intizama son derece önem verirsin. Gevşeklik, uyumsuzluk, özensizlik veya "olur böyle şeyler" tavrına asla göz yummazsın. Fotoğraftaki kişinin üzerindeki kombini bu titiz gözle değerlendir.

TUTUM: Hâlâ ölçülü, otoriter ve öğüt verir gibi konuşan bir üslubun var — aşırı sıcak veya yaltaklanan bir dil kullanma. Ama artık dengeli ve adil bir gözlemcisin: iyi yapılmış bir seçimi açıkça ve gönülden takdir et, sorunlu noktaları da net biçimde belirt. Amacın kusur avcılığı değil, yapıcı ve gerçekçi bir değerlendirme sunmak. Nazik ama otoriter bir üslup kullan; bir öğrenciyi yüreklendirerek düzelten bir öğretmen gibi konuş. Kaba veya aşağılayıcı olma.

ÖNEMLİ - GÖZLEM DOĞRULUĞU: Bir eleştiri veya öneri yazmadan önce, o detayın fotoğrafta GERÇEKTE nasıl göründüğünü dikkatle kontrol et; tahmin yürütme, sadece net biçimde gördüğünü esas al. Bu özellikle bel bölgesinde (üstün pantolon/etek içine sokulup sokulmadığı) sık yapılan bir hatadır: üst zaten içeri sokulmuşsa "içine sokun" gibi bir öneri veya eleştiri ASLA verme — önce mevcut durumu doğru tespit et, sonra ona göre yorum yap. Aynı titizliği kolların sıvanmış olup olmadığı, fermuarın açık/kapalı durumu gibi diğer somut detaylar için de uygula.

SADECE şu JSON formatında cevap ver, başka hiçbir metin, açıklama veya markdown kullanma:

{
  "genel_izlenim": "1-2 cümlelik, sert ve doğrudan genel değerlendirme (bir mürebbiyenin ağzından)",
  "puan": 62,
  "kriterler": {
    "color_palette": {"puan": 65, "aciklama": "1 cümlelik, sert ve somut değerlendirme"},
    "style_cohesion": {"puan": 60, "aciklama": "1 cümlelik, sert ve somut değerlendirme"},
    "fit_and_silhouette": {"puan": 55, "aciklama": "1 cümlelik, sert ve somut değerlendirme"},
    "seasonal_suitability": {"puan": 70, "aciklama": "1 cümlelik, sert ve somut değerlendirme"},
    "accessories": {"puan": 40, "aciklama": "1 cümlelik, sert ve somut değerlendirme"}
  },
  "guven": {"seviye": "yüksek", "neden": "kısa gerekçe, ör. fotoğraf net ve iyi ışıklandırılmış"},
  "oneriler": ["ayarlama önerisi 1", "ayarlama önerisi 2", "ayarlama önerisi 3"]
}

PUANLAMA KURALI: Kombini şu 5 kritere göre AYRI AYRI değerlendir ve her biri için 1-100 arası tam sayı puan ver:
1. color_palette (Renk Paleti ve Denge) — ağırlık %30
2. style_cohesion (Stil Bütünlüğü) — ağırlık %25
3. fit_and_silhouette (Silüet ve Oran Dengesi) — ağırlık %20
4. seasonal_suitability (Mevsim ve Kumaş Uyumu) — ağırlık %15
5. accessories (Aksesuar Detayları) — ağırlık %10

Puanları dengeli ve adil dağıt; her kritere şu ölçeği uygula: 1-40 belirgin sorunlu; 41-60 vasat, geliştirilebilir yönleri olan; 61-80 iyi, küçük eksikleri olan (çoğu kriter burada olabilir); 81-92 gerçekten başarılı, dikkatli düşünülmüş; 93-100 kusursuza yakın, nadiren verilir. İyi kurulmuş bir kombine hak ettiği yüksek puanı vermekten çekinme — amaç kusur aramak değil, adil bir değerlendirme yapmak. Kombinde bir aksesuar hiç yoksa accessories puanını buna göre düşük ver, "yok" diye ortalamaya çekme.

color_palette KRİTERİ İÇİN ÖZEL TALİMAT: Sadece "uyumlu/uyumsuz" demekle yetinme; hangi klasik renk ilişkisinin kurulduğunu adlandır:
- Tamamlayıcı (complementary): renk çemberinde karşıt renkler bir arada mı kullanılmış?
- Analog (analogous): birbirine yakın, aynı aile tonlar mı tercih edilmiş?
- Bölünmüş tamamlayıcı (split-complementary): tamamlayıcının yumuşatılmış bir versiyonu mu?
- Doygun/mat (saturated/muted) denge: canlı ve donuk tonların oranı gözetilmiş mi?
Zamana dayanıklı, klasik renk-kompozisyon geleneğinin (Sanzo Wada'nın kataloğunun temsil ettiği türden ölçülü, disiplinli renk eşleştirme anlayışının) beklediği titizlikle değerlendir. Hangi ilişkinin kurulduğunu belirt ve bunun ne kadar başarılı uygulandığını söyle — sadece "hoş" ya da "uyumsuz" gibi yüzeysel bir yargıyla geçme.

"puan" alanı (genel puan), bu 5 alt puanın ağırlıklı ortalamasıdır — KENDİN hesapla ve 0-100 arası en yakın tam sayıya yuvarla:
puan = color_palette×0.30 + style_cohesion×0.25 + fit_and_silhouette×0.20 + seasonal_suitability×0.15 + accessories×0.10

guven.seviye değeri "yüksek", "orta" veya "düşük" olmalı; fotoğrafın netliği, ışığı, açısı ve kombinin ne kadarının göründüğüne göre dürüstçe belirle — emin değilsen "düşük" veya "orta" demekten çekinme. Türkçe, resmi ve otoriter bir dil kullan; "harika", "çok yakışmış", "süpersin" gibi ifadelerden kaçın.

ÖNEMLİ - oneriler kuralı: Kullanıcının dolabında ne olduğunu bilmiyorsun, bu yüzden "şu ceketi al" gibi yeni bir parça satın almayı gerektiren öneriler verme. Bunun yerine kombinde ZATEN VAR OLAN unsurlar üzerinde yapılabilecek somut ayarlamalar öner: bir parçanın nasıl giyildiğini değiştirmek (kollarını sıvamak, içine sıkıştırmak, katman eklemek/çıkarmak, fermuarı açık bırakmak), renk dengesini değiştirmek (bir üst tonu koyulaştırma/açma fikri, aksesuarla kırma), veya dururken/pozdaki küçük değişiklikler. Önerileri bir talimat/emir netliğinde yaz (ör. "Kolları sıvayın", "Fermuarı kapatın") — bir mağazaya gitmeyi değil, aynadaki 30 saniyelik bir düzeltmeyi çağrıştırmalı.

AKSESUAR KURALI: oneriler listesindeki 3 maddeden EN AZ BİRİ mutlaka aksesuara dair olmalı. Fotoğrafta bir aksesuar (saat, kolye, kemer, çanta, atkı, küpe vb.) görünüyorsa onun hakkında somut bir ayarlama öner (ör. "Kemeri gizleme, dışarıda bırak", "Saati diğer koluna al"). Hiç aksesuar yoksa veya yetersizse, elde zaten bulunması muhtemel sıradan bir parçayı (saat, ince bir kemer, küçük küpe gibi) eklemeyi öner — ama "şu markadan şunu al" gibi bir satın alma çağrısına dönüştürme, "Bir kol saati takın" gibi nötr bir talimat olarak yaz.`;

// 5 ağırlıklı değerlendirme kriteri — sıra, ağırlıklar ve ikonlar burada
// sabit, model sadece her biri için puan ve kısa gerekçe döndürür.
const CRITERIA = [
  { key: 'color_palette', label: 'Renk Paleti', weight: 30, Icon: Palette },
  { key: 'style_cohesion', label: 'Stil Bütünlüğü', weight: 25, Icon: Shirt },
  { key: 'fit_and_silhouette', label: 'Silüet ve Oran', weight: 20, Icon: Ruler },
  { key: 'seasonal_suitability', label: 'Mevsim Uyumu', weight: 15, Icon: Sun },
  { key: 'accessories', label: 'Aksesuar Detayları', weight: 10, Icon: Gem },
];

// Sol sütundaki statik aksesuar fikri kartları — kullanıcının dolabında
// gerçekte ne olduğunu bilmediğimiz için kişiselleştirilmiş bir öneri değil,
// AKSESUAR KURALI'nın işaret ettiği genel kategorilere dair nazik bir hatırlatma.
const ACCESSORY_IDEAS = [
  { label: 'Kolye', hint: 'İnce bir zincir yaka boşluğunu tamamlar', Icon: Gem },
  { label: 'Saat', hint: 'Bilekte sade bir kol saati bütünlüğü güçlendirir', Icon: Watch },
];

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
            position: 'absolute', top: '100%', left: 0, marginTop: 8, width: 230, zIndex: 20,
            background: C.ink, color: '#F5F0E6', fontSize: 12, fontWeight: 400, lineHeight: 1.5,
            padding: '10px 12px', borderRadius: 10,
            boxShadow: '4px 8px 20px rgba(43,37,30,0.35)',
          }}
        >
          {tooltip}
        </div>
      )}
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

function AccessoryIdeaCard({ label, hint, Icon }) {
  return (
    <div
      className="idea-card flex-1 flex flex-col items-center text-center gap-2 rounded-2xl"
      style={{ background: C.bg, boxShadow: SHADOW.raisedSm, padding: '16px 10px', transition: 'transform 0.15s ease' }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 38, height: 38, background: C.bg, boxShadow: SHADOW.inset, color: C.accent }}
      >
        <Icon size={17} strokeWidth={1.8} />
      </div>
      <span className="font-sans font-semibold" style={{ fontSize: 12.5, color: C.ink }}>{label}</span>
      <span className="font-sans" style={{ fontSize: 10.5, color: C.inkFaint, lineHeight: 1.4 }}>{hint}</span>
    </div>
  );
}

const DEFAULT_BLUR_CENTER_X = 0.5;
const DEFAULT_BLUR_CENTER_Y = 0.16;
const DEFAULT_BLUR_RADIUS = 0.18;
const MIN_BLUR_RADIUS = 0.06;
const MAX_BLUR_RADIUS = 0.5;

// Anthropic anahtarı ve model adı, kaynak koduna gömülmek yerine index.html
// tarafından önceden yüklenen config.js dosyasından okunur (bkz. config.example.js).
const APP_CONFIG = (typeof window !== 'undefined' && window.APP_CONFIG) || {};
const ANTHROPIC_MODEL = APP_CONFIG.model || 'claude-sonnet-5';

export default function OutfitStylist() {
  const [rawImage, setRawImage] = useState(null); // never sent anywhere, kept only in this browser tab
  const [safeImage, setSafeImage] = useState(null); // face-blurred version, this is what gets uploaded
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(true);
  const [blurCenterX, setBlurCenterX] = useState(DEFAULT_BLUR_CENTER_X);
  const [blurCenterY, setBlurCenterY] = useState(DEFAULT_BLUR_CENTER_Y);
  const [blurRadius, setBlurRadius] = useState(DEFAULT_BLUR_RADIUS);
  const [blurring, setBlurring] = useState(false);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const photoRef = useRef(null);
  const activeHandleRef = useRef(null); // 'move' | 'resize' | null
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, centerX: 0, centerY: 0 });
  const blurCenterXRef = useRef(DEFAULT_BLUR_CENTER_X);
  const blurCenterYRef = useRef(DEFAULT_BLUR_CENTER_Y);
  const blurRadiusRef = useRef(DEFAULT_BLUR_RADIUS);

  useEffect(() => { blurCenterXRef.current = blurCenterX; }, [blurCenterX]);
  useEffect(() => { blurCenterYRef.current = blurCenterY; }, [blurCenterY]);
  useEffect(() => { blurRadiusRef.current = blurRadius; }, [blurRadius]);

  const loadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const img = await fileToImage(file);
      setRawImage(img);
      setBlurCenterX(DEFAULT_BLUR_CENTER_X);
      setBlurCenterY(DEFAULT_BLUR_CENTER_Y);
      setBlurRadius(DEFAULT_BLUR_RADIUS);
      setFaceBlurEnabled(true);
      setResult(null);
      setStatus('idle');
      setErrorMsg('');
    } catch {
      setErrorMsg('Fotoğraf yüklenemedi. Tekrar dener misin?');
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
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const onZoneDragEnter = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }, []);
  const onZoneDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);
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
    // Dairenin kendisi zaten anlık hareket ediyor (aşağıdaki stil, state'e
    // doğrudan bağlı); sadece maliyetli görsel yeniden oluşturma işlemi
    // geciktiriliyor.
    const isDragging = !!activeHandleRef.current;
    setBlurring(true);
    const delay = isDragging ? 120 : 0;
    const timer = setTimeout(() => {
      applyFaceBlur(
        rawImage.dataUrl, rawImage.mediaType,
        blurCenterX, blurCenterY, faceBlurEnabled ? blurRadius : 0
      )
        .then((res) => {
          if (!cancelled) setSafeImage(res);
        })
        .catch(() => {
          if (!cancelled) setErrorMsg('Fotoğraf işlenemedi. Tekrar dener misin?');
        })
        .finally(() => {
          if (!cancelled) setBlurring(false);
        });
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

  const onHandleDragEnd = useCallback(() => {
    activeHandleRef.current = null;
  }, []);

  const analyze = useCallback(async () => {
    if (!safeImage) return;
    if (!APP_CONFIG.apiProxyUrl) {
      setErrorMsg('Proxy adresi ayarlanmamış. config.js dosyasını config.example.js şablonuna göre doldurun.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      // Anthropic API'ye doğrudan tarayıcıdan değil, anahtarı sunucu
      // tarafında (Cloudflare Worker) saklayan kendi proxy'mize istek
      // atıyoruz — bkz. proxy/worker.js.
      const response = await fetch(APP_CONFIG.apiProxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          // 5 kriterin her biri için ayrı puan + gerekçe istediğimizden yanıt
          // eskisinden daha uzun; 1000 bazen yetmeyip yarım/geçersiz JSON'a
          // yol açıyordu. Payı büyüttük.
          max_tokens: 1600,
          // Sabit talimat metni system'e taşındı ve cache_control ile
          // işaretlendi: aynı oturumda birden fazla kombin denendiğinde,
          // 5 dakika içindeki tekrar isteklerde bu metin tam fiyattan değil
          // ~1/10 fiyattan (cache hit) faturalandırılır. Görsel her seferinde
          // farklı olduğu için ayrı kalıyor ve cache'i bozmuyor.
          system: [
            { type: 'text', text: PROMPT, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: safeImage.mediaType, data: safeImage.base64 } },
            ],
          }],
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
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        // Model bazen JSON'un öncesine/sonrasına küçük bir açıklama ekleyebilir;
        // en dıştaki { ... } bloğunu ayıklayıp tekrar dene.
        const match = clean.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('JSON ayrıştırılamadı');
        parsed = JSON.parse(match[0]);
      }
      setResult(parsed);
      setStatus('done');
    } catch (err) {
      console.error('Kombin analizi hatası:', err);
      setErrorMsg(`Kombinini değerlendirirken bir sorun oldu: ${err.message}`);
      setStatus('error');
    }
  }, [safeImage]);

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
    setRawImage(null);
    setSafeImage(null);
    setResult(null);
    setStatus('idle');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full flex justify-center font-sans" style={{ background: C.bg }}>
      {STYLES}
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

        {/* Upload zone */}
        {!rawImage && (
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
            onDragEnter={onZoneDragEnter}
            onDragOver={onZoneDragOver}
            onDragLeave={onZoneDragLeave}
            onDrop={onZoneDrop}
            className="flex flex-col items-center justify-center text-center px-6 py-20 cursor-pointer rounded-3xl"
            style={{
              background: C.bg,
              boxShadow: isDragOver ? SHADOW.raised : SHADOW.inset,
              border: `2px dashed ${isDragOver ? C.accent : C.line}`,
              transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <div
              className="rounded-full flex items-center justify-center mb-5"
              style={{
                width: 72, height: 72, background: C.bg,
                boxShadow: isDragOver ? SHADOW.accent : SHADOW.raised,
                color: C.accent,
                transform: isDragOver ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <Upload size={28} strokeWidth={1.6} />
            </div>
            <p className="font-sans font-bold" style={{ fontSize: 19, color: C.ink, marginBottom: 8 }}>
              {isDragOver ? 'Bırakın, yükleniyor…' : 'Fotoğrafı buraya sürükleyin'}
            </p>
            <p className="font-sans" style={{ fontSize: 14.5, color: C.inkSoft, marginBottom: 24, maxWidth: 300 }}>
              Kombinin net görünen, tam boy veya üst gövde fotoğrafı en iyi sonucu verir.
            </p>
            <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => cameraRef.current && cameraRef.current.click()}
                className="press-btn flex items-center gap-2 font-sans font-semibold rounded-2xl"
                style={{ fontSize: 14, color: C.ink, background: C.bg, boxShadow: SHADOW.raisedSm, padding: '12px 18px' }}
              >
                <Camera size={17} /> Fotoğraf Çek
              </button>
              <button
                onClick={() => galleryRef.current && galleryRef.current.click()}
                className="press-btn flex items-center gap-2 font-sans font-semibold rounded-2xl"
                style={{ fontSize: 14, color: '#FFFFFF', background: C.accent, boxShadow: SHADOW.accent, padding: '12px 18px' }}
              >
                <Upload size={17} /> Galeriden Seç
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
            <input ref={galleryRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
            <p className="font-sans" style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 20, maxWidth: 300, lineHeight: 1.6 }}>
              Yüzün otomatik olarak bulanıklaştırılır; orijinal fotoğraf hiçbir yere gönderilmez, sadece bulanıklaştırılmış hâli kıyafet analizi için paylaşılır.
            </p>
          </div>
        )}

        {/* Fotoğraf + sonuçlar: geniş ekranda yan yana, dar ekranda alt alta */}
        {rawImage && (
        <div className="stylist-layout">
        <div className="stylist-photo-col">
        {/* Photo card */}
        <div
          ref={photoRef}
          className="relative overflow-hidden select-none rounded-3xl mb-5"
          style={{ background: C.bg, boxShadow: SHADOW.raised, padding: 12, touchAction: faceBlurEnabled ? 'none' : 'auto' }}
          onMouseMove={faceBlurEnabled ? onHandleDragMove : undefined}
          onMouseUp={faceBlurEnabled ? onHandleDragEnd : undefined}
          onMouseLeave={faceBlurEnabled ? onHandleDragEnd : undefined}
          onTouchMove={faceBlurEnabled ? onHandleDragMove : undefined}
          onTouchEnd={faceBlurEnabled ? onHandleDragEnd : undefined}
        >
          <img
            src={(safeImage || rawImage).dataUrl}
            alt="Yüklenen kombin (yüz bulanıklaştırılmış önizleme)"
            className="w-full object-cover block stylist-photo-img"
            style={{ borderRadius: 18, opacity: blurring ? 0.6 : 1 }}
            draggable={false}
          />
          {faceBlurEnabled && (
            <>
              {/* Bulanıklaştırılan daireyi görünür kılan gölge — width %
                  + aspect-ratio:1 + translate(-50%,-50%) ile fotoğrafın
                  en/boy oranından bağımsız olarak her zaman tam daire. */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `calc(12px + ${blurCenterX} * (100% - 24px))`,
                  top: `calc(12px + ${blurCenterY} * (100% - 24px))`,
                  width: `calc(${blurRadius * 2} * (100% - 24px))`,
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: 'rgba(181,86,61,0.10)',
                  border: `2px dashed ${C.accent}`,
                }}
              />
              {/* Merkez tutamacı — tutup taşımak için */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: `calc(12px + ${blurCenterX} * (100% - 24px))`,
                  top: `calc(12px + ${blurCenterY} * (100% - 24px))`,
                  width: 40, height: 40, transform: 'translate(-50%, -50%)',
                  cursor: activeHandleRef.current === 'move' ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
                onMouseDown={onHandleDragStart('move')}
                onTouchStart={onHandleDragStart('move')}
              >
                <div
                  style={{
                    width: 15, height: 15, borderRadius: 999, background: C.accent,
                    border: '2px solid #FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
              {/* Kenar tutamacı — sürükleyip yarıçapı değiştirmek için */}
              <div
                className="absolute flex items-center justify-center cursor-ew-resize"
                style={{
                  left: `calc(12px + ${blurCenterX + blurRadius} * (100% - 24px))`,
                  top: `calc(12px + ${blurCenterY} * (100% - 24px))`,
                  width: 22, height: 22, transform: 'translate(-50%, -50%)',
                  touchAction: 'none',
                }}
                onMouseDown={onHandleDragStart('resize')}
                onTouchStart={onHandleDragStart('resize')}
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
          <button
            onClick={reset}
            className="press-icon press-btn absolute flex items-center justify-center rounded-full"
            style={{ top: 24, right: 24, width: 32, height: 32, background: C.bg, color: C.ink, boxShadow: SHADOW.raisedSm }}
            aria-label="Fotoğrafı kaldır"
          >
            <X size={15} />
          </button>
        </div>

        <label className="flex items-center gap-2.5 mb-6 font-sans" style={{ fontSize: 13, color: C.inkSoft, fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={faceBlurEnabled}
            onChange={(e) => setFaceBlurEnabled(e.target.checked)}
            style={{ accentColor: C.accent, width: 16, height: 16 }}
          />
          Yüzümü bulanıklaştır <span style={{ color: C.inkFaint, fontWeight: 400 }}>(ortadan taşı, kenardan boyutlandır)</span>
        </label>

        {status !== 'done' && (
          <button
            onClick={analyze}
            disabled={status === 'loading' || blurring || !safeImage}
            className="press-btn w-full flex items-center justify-center gap-2 font-sans font-bold mb-8 rounded-2xl"
            style={{
              fontSize: 15.5, color: '#FFFFFF',
              background: (status === 'loading' || blurring || !safeImage) ? C.inkFaint : C.accent,
              padding: '16px 16px',
              boxShadow: (status === 'loading' || blurring || !safeImage) ? SHADOW.inset : SHADOW.accent,
            }}
          >
            {blurring ? (
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

        {status === 'error' && (
          <div
            className="font-sans mb-8 px-4 py-3 rounded-2xl"
            style={{ fontSize: 13.5, color: C.accent, background: C.bg, boxShadow: SHADOW.inset, fontWeight: 500 }}
          >
            {errorMsg}
          </div>
        )}

        {/* Aksesuar fikirleri — değerlendirme bitmeden gösterilmesinin bir
            anlamı yok; sonuçla birlikte, sol sütunda sonuca eşlik ederek çıkar. */}
        {status === 'done' && result && (
          <div className="flex flex-col gap-3">
            <SectionLabel>Aksesuar Fikirleri</SectionLabel>
            <div className="flex gap-3">
              {ACCESSORY_IDEAS.map((a) => (
                <AccessoryIdeaCard key={a.label} label={a.label} hint={a.hint} Icon={a.Icon} />
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Results */}
        {status === 'done' && result && (
          <div className="stylist-results-col">
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
        )}
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
createRoot(rootEl).render(<OutfitStylist />);
