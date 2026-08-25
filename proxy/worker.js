// Cloudflare Worker — Anthropic API anahtarını tarayıcıdan gizleyen proxy.
//
// KURULUM:
// 1. dash.cloudflare.com > Workers & Pages > Create > "Deploy a Worker" > "Edit code"
//    (Hello World şablonuyla açılan Quick Edit ekranına bu dosyanın TAMAMINI yapıştırın.)
// 2. Worker ayarlarında Settings > Variables and Secrets > "Add" ile:
//      İsim: ANTHROPIC_API_KEY   Tip: Secret   Değer: kendi Anthropic API anahtarınız (sk-ant-...)
//    ekleyin ve Deploy edin.
// 3. Aşağıdaki ALLOWED_ORIGIN sabitini, Cloudflare Pages'te yayınlayacağınız
//    sitenin gerçek adresiyle (ör. https://kiyafet-danismani.pages.dev) güncelleyip
//    tekrar Deploy edin.
// 4. Worker'ın size verdiği adresi (ör. https://kiyafet-danismani-proxy.KULLANICI-ADINIZ.workers.dev)
//    config.js dosyasındaki apiProxyUrl alanına yazın.
//
// NOT: Bu proxy, adresi bilen herkesin isteğini Anthropic'e iletir (kimlik
// doğrulaması yok) — CORS ayarı sadece TARAYICI üzerinden başka sitelerin
// çağırmasını engeller, doğrudan komut satırından yapılan çağrıları değil.
// Bu yüzden Anthropic Console'da (console.anthropic.com > Settings > Limits)
// bir harcama sınırı/uyarısı ayarlamanız şiddetle önerilir.

const ALLOWED_ORIGIN = 'https://danismanik.pages.dev';

function buildCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = buildCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: { message: 'Worker tarafında ANTHROPIC_API_KEY ayarlanmamış.' } }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    let bodyText;
    try {
      bodyText = await request.text();
    } catch {
      return new Response('Bad request', { status: 400, headers: cors });
    }

    let anthropicResponse;
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: bodyText,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: { message: `Anthropic'e ulaşılamadı: ${err.message}` } }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const responseHeaders = new Headers(cors);
    responseHeaders.set('Content-Type', anthropicResponse.headers.get('Content-Type') || 'application/json');

    return new Response(anthropicResponse.body, {
      status: anthropicResponse.status,
      headers: responseHeaders,
    });
  },
};
