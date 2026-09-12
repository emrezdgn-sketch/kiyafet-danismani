import { CRITERIA } from './constants.js';

const CRITERIA_KEYS = CRITERIA.map((c) => c.key);
const WEIGHT_MAP = Object.fromEntries(CRITERIA.map((c) => [c.key, c.weight]));
const VALID_GUVEN = ['yüksek', 'orta', 'düşük'];
const SCORE_TOLERANCE = 3;

function clampScore(v) {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

export function validateAndNormalize(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('API yanıtı geçerli bir nesne değil.');
  }

  if (typeof raw.genel_izlenim !== 'string' || !raw.genel_izlenim.trim()) {
    throw new Error('Yanıtta "genel_izlenim" alanı eksik veya boş.');
  }

  if (raw.puan == null || isNaN(Number(raw.puan))) {
    throw new Error('Yanıtta "puan" alanı eksik veya sayısal değil.');
  }

  if (!raw.kriterler || typeof raw.kriterler !== 'object') {
    throw new Error('Yanıtta "kriterler" alanı eksik.');
  }

  const normalizedKriterler = {};
  for (const key of CRITERIA_KEYS) {
    const entry = raw.kriterler[key];
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Kriter "${key}" yanıtta eksik.`);
    }
    if (entry.puan == null || isNaN(Number(entry.puan))) {
      throw new Error(`Kriter "${key}" için puan eksik veya sayısal değil.`);
    }
    normalizedKriterler[key] = {
      puan: clampScore(entry.puan),
      aciklama: typeof entry.aciklama === 'string' ? entry.aciklama.trim() : '',
    };
  }

  const recalculated = CRITERIA_KEYS.reduce(
    (sum, key) => sum + normalizedKriterler[key].puan * (WEIGHT_MAP[key] / 100),
    0,
  );
  const recalculatedRounded = Math.round(recalculated);

  const modelScore = clampScore(raw.puan);
  const puan = Math.abs(modelScore - recalculatedRounded) > SCORE_TOLERANCE
    ? recalculatedRounded
    : modelScore;

  let guven = { seviye: 'orta', neden: '' };
  if (raw.guven && typeof raw.guven === 'object') {
    const seviye = VALID_GUVEN.includes(raw.guven.seviye) ? raw.guven.seviye : 'orta';
    const neden = typeof raw.guven.neden === 'string' ? raw.guven.neden.trim() : '';
    guven = { seviye, neden };
  }

  let oneriler = [];
  if (Array.isArray(raw.oneriler)) {
    oneriler = raw.oneriler
      .filter((o) => typeof o === 'string' && o.trim())
      .map((o) => o.trim());
  }

  return {
    genel_izlenim: raw.genel_izlenim.trim(),
    puan,
    kriterler: normalizedKriterler,
    guven,
    oneriler,
  };
}
