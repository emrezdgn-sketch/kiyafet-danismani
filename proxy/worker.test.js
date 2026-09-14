import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJSON, validateAndNormalize, isAllowedOrigin } from './worker.js';

// Weights: color_palette 30, style_cohesion 25, fit_and_silhouette 20,
// seasonal_suitability 15, accessories 10.
// 80*0.30 + 60*0.25 + 50*0.20 + 90*0.15 + 40*0.10 = 66.5 -> rounds to 67.
const ASYMMETRIC_KRITERLER = {
  color_palette: { puan: 80, aciklama: 'Renkler uyumlu.' },
  style_cohesion: { puan: 60, aciklama: 'Stil tutarlı.' },
  fit_and_silhouette: { puan: 50, aciklama: 'Kesim uygun.' },
  seasonal_suitability: { puan: 90, aciklama: 'Mevsime uygun.' },
  accessories: { puan: 40, aciklama: 'Aksesuar yeterli.' },
};
const OFFICIAL_SCORE = 67;

function validRaw(overrides = {}) {
  return {
    genel_izlenim: 'Kombin genel olarak dengeli.',
    puan: OFFICIAL_SCORE,
    kriterler: ASYMMETRIC_KRITERLER,
    guven: { seviye: 'yüksek', neden: 'Fotoğraf net.' },
    oneriler: ['Kolları sıvayın.', 'Fermuarı kapatın.', 'Saat takın.'],
    ...overrides,
  };
}

test('extractJSON parses a clean JSON string', () => {
  const result = extractJSON('{"a": 1}');
  assert.deepEqual(result, { a: 1 });
});

test('extractJSON strips markdown code fences', () => {
  const result = extractJSON('```json\n{"a": 1}\n```');
  assert.deepEqual(result, { a: 1 });
});

test('extractJSON extracts a JSON object embedded in surrounding text', () => {
  const result = extractJSON('Here is the result: {"a": 1} — done.');
  assert.deepEqual(result, { a: 1 });
});

test('extractJSON throws on malformed JSON with no recoverable object', () => {
  assert.throws(() => extractJSON('not json at all'), /ayrıştırılamadı/);
});

test('official score always equals the weighted criterion calculation', () => {
  const result = validateAndNormalize(validRaw());
  assert.equal(result.puan, OFFICIAL_SCORE);
});

test('model total score lower by 1 does not affect the canonical score', () => {
  const result = validateAndNormalize(validRaw({ puan: OFFICIAL_SCORE - 1 }));
  assert.equal(result.puan, OFFICIAL_SCORE);
});

test('model total score higher by 1 does not affect the canonical score', () => {
  const result = validateAndNormalize(validRaw({ puan: OFFICIAL_SCORE + 1 }));
  assert.equal(result.puan, OFFICIAL_SCORE);
});

test('model total score lower by 3 does not affect the canonical score', () => {
  const result = validateAndNormalize(validRaw({ puan: OFFICIAL_SCORE - 3 }));
  assert.equal(result.puan, OFFICIAL_SCORE);
});

test('model total score higher by 3 does not affect the canonical score', () => {
  const result = validateAndNormalize(validRaw({ puan: OFFICIAL_SCORE + 3 }));
  assert.equal(result.puan, OFFICIAL_SCORE);
});

test('a wildly incorrect model score does not affect the canonical score', () => {
  assert.equal(validateAndNormalize(validRaw({ puan: 0 })).puan, OFFICIAL_SCORE);
  assert.equal(validateAndNormalize(validRaw({ puan: 999 })).puan, OFFICIAL_SCORE);
  assert.equal(validateAndNormalize(validRaw({ puan: -50 })).puan, OFFICIAL_SCORE);
});

test('the canonical score is computed even when the model omits "puan" entirely', () => {
  const raw = validRaw();
  delete raw.puan;
  const result = validateAndNormalize(raw);
  assert.equal(result.puan, OFFICIAL_SCORE);
});

test('the canonical score is computed even when the model sends a non-numeric "puan"', () => {
  const result = validateAndNormalize(validRaw({ puan: 'yüksek' }));
  assert.equal(result.puan, OFFICIAL_SCORE);
});

test('canonical successful response contains version: 1', () => {
  const result = validateAndNormalize(validRaw());
  assert.equal(result.version, 1);
});

test('validateAndNormalize accepts a valid response and preserves its content', () => {
  const result = validateAndNormalize(validRaw());
  assert.equal(result.genel_izlenim, 'Kombin genel olarak dengeli.');
  assert.equal(result.kriterler.color_palette.puan, 80);
  assert.equal(result.guven.seviye, 'yüksek');
  assert.equal(result.oneriler.length, 3);
});

test('validateAndNormalize throws when a required criterion is missing', () => {
  const raw = validRaw();
  raw.kriterler = { ...raw.kriterler };
  delete raw.kriterler.accessories;
  assert.throws(() => validateAndNormalize(raw), /accessories.*eksik/);
});

test('validateAndNormalize throws when genel_izlenim has the wrong type', () => {
  const raw = validRaw({ genel_izlenim: 12345 });
  assert.throws(() => validateAndNormalize(raw), /genel_izlenim/);
});

test('validateAndNormalize clamps a criterion score below 0', () => {
  const raw = validRaw();
  raw.kriterler = { ...raw.kriterler, accessories: { puan: -20, aciklama: '' } };
  const result = validateAndNormalize(raw);
  assert.equal(result.kriterler.accessories.puan, 0);
});

test('validateAndNormalize clamps a criterion score above 100', () => {
  const raw = validRaw();
  raw.kriterler = { ...raw.kriterler, accessories: { puan: 150, aciklama: '' } };
  const result = validateAndNormalize(raw);
  assert.equal(result.kriterler.accessories.puan, 100);
});

test('a clamped criterion score still feeds the canonical weighted calculation', () => {
  const raw = validRaw();
  // accessories clamps from 150 -> 100, so the recalculation must use 100.
  raw.kriterler = { ...raw.kriterler, accessories: { puan: 150, aciklama: '' } };
  const result = validateAndNormalize(raw);
  // 80*0.30 + 60*0.25 + 50*0.20 + 90*0.15 + 100*0.10 = 72.5 -> 73
  assert.equal(result.puan, 73);
});

test('validateAndNormalize defaults guven when the field is missing', () => {
  const raw = validRaw({ guven: undefined });
  const result = validateAndNormalize(raw);
  assert.deepEqual(result.guven, { seviye: 'orta', neden: '' });
});

test('validateAndNormalize normalizes an invalid guven.seviye to "orta"', () => {
  const raw = validRaw({ guven: { seviye: 'çok yüksek', neden: 'abartılı' } });
  const result = validateAndNormalize(raw);
  assert.equal(result.guven.seviye, 'orta');
});

test('validateAndNormalize filters non-string entries out of oneriler', () => {
  const raw = validRaw({ oneriler: ['Geçerli öneri', 42, null, '  ', 'İkinci öneri  '] });
  const result = validateAndNormalize(raw);
  assert.deepEqual(result.oneriler, ['Geçerli öneri', 'İkinci öneri']);
});

test('validateAndNormalize defaults oneriler to an empty array when missing', () => {
  const raw = validRaw({ oneriler: undefined });
  const result = validateAndNormalize(raw);
  assert.deepEqual(result.oneriler, []);
});

test('isAllowedOrigin accepts the production origin', () => {
  assert.equal(isAllowedOrigin('https://danismanik.pages.dev'), true);
});

test('isAllowedOrigin accepts a Cloudflare Pages preview subdomain', () => {
  assert.equal(isAllowedOrigin('https://07b463fc.danismanik.pages.dev'), true);
});

test('isAllowedOrigin rejects an unrelated origin', () => {
  assert.equal(isAllowedOrigin('https://evil.example.com'), false);
});

test('isAllowedOrigin rejects a lookalike domain that only ends with our domain', () => {
  assert.equal(isAllowedOrigin('https://danismanik.pages.dev.evil.com'), false);
});

test('isAllowedOrigin rejects a preview subdomain over plain http', () => {
  assert.equal(isAllowedOrigin('http://07b463fc.danismanik.pages.dev'), false);
});

test('isAllowedOrigin rejects an empty or missing origin', () => {
  assert.equal(isAllowedOrigin(''), false);
});
