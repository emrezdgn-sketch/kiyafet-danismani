const ALLOWED_ORIGIN = 'https://danismanik.pages.dev';
// Cloudflare Pages gives every preview deploy (a branch push or PR) its own
// random subdomain, e.g. https://07b463fc.danismanik.pages.dev — anchored so
// it only ever matches that one extra subdomain level under our own domain.
const PREVIEW_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.danismanik\.pages\.dev$/;

export function isAllowedOrigin(origin) {
  return origin === ALLOWED_ORIGIN || PREVIEW_ORIGIN_PATTERN.test(origin);
}

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 2400;
const ANTHROPIC_VERSION = '2023-06-01';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB base64 decoded
const MAX_BODY_BYTES = 8 * 1024 * 1024;  // 8 MB raw request body
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const ipHits = new Map();

// Canonical scoring authority. This is the ONLY place criterion weights are
// used to compute a total score — the frontend only displays these numbers.
const CRITERIA_WEIGHTS = {
  color_palette: 30,
  style_cohesion: 25,
  fit_and_silhouette: 20,
  seasonal_suitability: 15,
  accessories: 10,
};
const CRITERIA_KEYS = Object.keys(CRITERIA_WEIGHTS);
const VALID_GUVEN = ['yüksek', 'orta', 'düşük'];
const CONTRACT_VERSION = 1;

const SYSTEM_PROMPT = `Eski usul, çok titiz ve kusur bulmakta asla çekinmeyen bir görgü öğretmeni / mürebbiyesin — Heidi çizgi filmindeki katı, disiplinli dadı karakterini düşün. Nezaket, düzen, özen ve intizama son derece önem verirsin. Gevşeklik, uyumsuzluk, özensizlik veya "olur böyle şeyler" tavrına asla göz yummazsın. Fotoğraftaki kişinin üzerindeki kombini bu titiz gözle değerlendir.

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

function buildCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export function extractJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON ayrıştırılamadı');
    return JSON.parse(match[0]);
  }
}

function clampScore(v) {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

// Canonical validation, normalization, and score authority for model output.
// This is the only place a model's response is trusted to become the
// application's official result — the frontend must not recompute it.
export function validateAndNormalize(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('API yanıtı geçerli bir nesne değil.');
  }

  if (typeof raw.genel_izlenim !== 'string' || !raw.genel_izlenim.trim()) {
    throw new Error('Yanıtta "genel_izlenim" alanı eksik veya boş.');
  }

  if (!raw.kriterler || typeof raw.kriterler !== 'object') {
    throw new Error('Yanıtta "kriterler" alanı eksik.');
  }

  const kriterler = {};
  for (const key of CRITERIA_KEYS) {
    const entry = raw.kriterler[key];
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Kriter "${key}" yanıtta eksik.`);
    }
    if (entry.puan == null || isNaN(Number(entry.puan))) {
      throw new Error(`Kriter "${key}" için puan eksik veya sayısal değil.`);
    }
    kriterler[key] = {
      puan: clampScore(entry.puan),
      aciklama: typeof entry.aciklama === 'string' ? entry.aciklama.trim() : '',
    };
  }

  // The official score is ALWAYS the weighted sum of validated criterion
  // scores under this Worker-owned formula. The model's own top-level
  // "puan" field is never read here — it is not part of the canonical
  // score contract, so the official score is always reproducible from
  // "kriterler" alone (required for Before/After deltas, A/B comparison,
  // and historical tracking).
  const puan = Math.round(
    CRITERIA_KEYS.reduce((sum, key) => sum + kriterler[key].puan * (CRITERIA_WEIGHTS[key] / 100), 0),
  );

  let guven = { seviye: 'orta', neden: '' };
  if (raw.guven && typeof raw.guven === 'object') {
    const seviye = VALID_GUVEN.includes(raw.guven.seviye) ? raw.guven.seviye : 'orta';
    const neden = typeof raw.guven.neden === 'string' ? raw.guven.neden.trim() : '';
    guven = { seviye, neden };
  }

  let oneriler = [];
  if (Array.isArray(raw.oneriler)) {
    oneriler = raw.oneriler.filter((o) => typeof o === 'string' && o.trim()).map((o) => o.trim());
  }

  return {
    version: CONTRACT_VERSION,
    genel_izlenim: raw.genel_izlenim.trim(),
    puan,
    kriterler,
    guven,
    oneriler,
  };
}

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = ipHits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    ipHits.set(ip, entry);
  }
  entry.count += 1;

  if (ipHits.size > 10_000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [k, v] of ipHits) {
      if (v.windowStart < cutoff) ipHits.delete(k);
    }
  }

  return entry.count <= RATE_LIMIT_MAX;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = buildCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: { message: 'Method not allowed' } }, 405, cors);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: { message: 'Worker tarafında ANTHROPIC_API_KEY ayarlanmamış.' } },
        500, cors,
      );
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return jsonResponse(
        { error: { message: 'Çok fazla istek gönderildi. Lütfen bir dakika bekleyip tekrar deneyin.' } },
        429, cors,
      );
    }

    let bodyText;
    try {
      bodyText = await request.text();
      if (bodyText.length > MAX_BODY_BYTES) {
        return jsonResponse(
          { error: { message: 'İstek gövdesi çok büyük.' } },
          413, cors,
        );
      }
    } catch {
      return jsonResponse({ error: { message: 'İstek okunamadı.' } }, 400, cors);
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: { message: 'Geçersiz JSON.' } }, 400, cors);
    }

    const { image, occasion } = payload;

    if (!image || typeof image.base64 !== 'string' || typeof image.media_type !== 'string') {
      return jsonResponse(
        { error: { message: 'Görsel verisi eksik veya hatalı.' } },
        400, cors,
      );
    }

    if (!ALLOWED_MEDIA_TYPES.includes(image.media_type)) {
      return jsonResponse(
        { error: { message: `Desteklenmeyen görsel formatı: ${image.media_type}` } },
        400, cors,
      );
    }

    const estimatedBytes = Math.ceil(image.base64.length * 0.75);
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return jsonResponse(
        { error: { message: 'Görsel boyutu çok büyük (maks. 5 MB).' } },
        413, cors,
      );
    }

    const userContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: image.media_type, data: image.base64 },
      },
    ];
    if (occasion && typeof occasion === 'string') {
      userContent.push({ type: 'text', text: occasion });
    }

    const anthropicBody = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userContent }],
    };

    let anthropicResponse;
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(anthropicBody),
      });
    } catch (err) {
      return jsonResponse(
        { error: { message: `Anthropic'e ulaşılamadı: ${err.message}` } },
        502, cors,
      );
    }

    if (!anthropicResponse.ok) {
      const responseHeaders = new Headers(cors);
      responseHeaders.set(
        'Content-Type',
        anthropicResponse.headers.get('Content-Type') || 'application/json',
      );
      return new Response(anthropicResponse.body, {
        status: anthropicResponse.status,
        headers: responseHeaders,
      });
    }

    let anthropicData;
    try {
      anthropicData = await anthropicResponse.json();
    } catch {
      return jsonResponse({ error: { message: 'Anthropic yanıtı ayrıştırılamadı.' } }, 502, cors);
    }

    if (anthropicData.stop_reason === 'max_tokens') {
      return jsonResponse({ error: { message: 'Yanıt yarıda kesildi (max_tokens sınırı).' } }, 502, cors);
    }

    const textBlock = (anthropicData.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      return jsonResponse({ error: { message: 'Boş yanıt.' } }, 502, cors);
    }

    let raw;
    try {
      raw = extractJSON(textBlock.text);
    } catch {
      return jsonResponse({ error: { message: 'Model yanıtı JSON olarak ayrıştırılamadı.' } }, 502, cors);
    }

    let canonical;
    try {
      canonical = validateAndNormalize(raw);
    } catch (err) {
      return jsonResponse({ error: { message: `Model yanıtı doğrulanamadı: ${err.message}` } }, 502, cors);
    }

    return jsonResponse(canonical, 200, cors);
  },
};
