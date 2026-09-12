import { CRITERIA } from './constants.js';

const CRITERIA_KEYS = CRITERIA.map((c) => c.key);

// Defensive check only: "is this response safe enough for the UI to render?"
// The Worker is the authority on what the score/normalization actually is —
// this function must never recompute or correct a value, only reject
// responses that are structurally unsafe to display.
export function assertSafeResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Sunucudan geçersiz bir yanıt geldi.');
  }
  if (typeof data.genel_izlenim !== 'string' || !data.genel_izlenim.trim()) {
    throw new Error('Sunucu yanıtında genel değerlendirme eksik.');
  }
  if (typeof data.puan !== 'number' || Number.isNaN(data.puan) || data.puan < 0 || data.puan > 100) {
    throw new Error('Sunucu yanıtında puan geçersiz.');
  }
  if (!data.kriterler || typeof data.kriterler !== 'object') {
    throw new Error('Sunucu yanıtında kriterler eksik.');
  }
  for (const key of CRITERIA_KEYS) {
    const entry = data.kriterler[key];
    if (!entry || typeof entry.puan !== 'number' || entry.puan < 0 || entry.puan > 100) {
      throw new Error(`Sunucu yanıtında "${key}" kriteri geçersiz.`);
    }
  }
  if (!Array.isArray(data.oneriler)) {
    throw new Error('Sunucu yanıtında öneriler listesi eksik.');
  }
}
