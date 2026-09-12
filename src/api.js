import { assertSafeResponse } from './validate.js';

const API_PROXY_URL = import.meta.env.VITE_API_PROXY_URL || '';

// The Worker is the canonical authority for parsing, validating, and scoring
// the model's response. This client only sends the request and defensively
// checks the DTO it gets back is safe to render — it must not recompute or
// correct the score itself.
export async function runAnalysis(safeImage, occasion) {
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
  assertSafeResponse(data);
  return data;
}

export function compareVerdict(a, b) {
  const pa = Math.round(Number(a.puan) || 0);
  const pb = Math.round(Number(b.puan) || 0);
  if (pa === pb) return { winner: null, text: `Başa baş: ikisi de ${pa}/100 ile eşit güçlü.` };
  const winner = pa > pb ? 'A' : 'B';
  const diff = Math.abs(pa - pb);
  return { winner, text: `${winner} kombini daha başarılı (${diff} puan fark).` };
}
