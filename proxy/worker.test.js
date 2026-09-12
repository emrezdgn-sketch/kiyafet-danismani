import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJSON, validateAndNormalize } from './worker.js';

function validRaw(overrides = {}) {
  return {
    genel_izlenim: 'Kombin genel olarak dengeli.',
    puan: 70,
    kriterler: {
      color_palette: { puan: 70, aciklama: 'Renkler uyumlu.' },
      style_cohesion: { puan: 70, aciklama: 'Stil tutarlı.' },
      fit_and_silhouette: { puan: 70, aciklama: 'Kesim uygun.' },
      seasonal_suitability: { puan: 70, aciklama: 'Mevsime uygun.' },
      accessories: { puan: 70, aciklama: 'Aksesuar yeterli.' },
    },
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

test('validateAndNormalize accepts a valid response and preserves the score within tolerance', () => {
  const result = validateAndNormalize(validRaw());
  assert.equal(result.puan, 70);
  assert.equal(result.genel_izlenim, 'Kombin genel olarak dengeli.');
  assert.equal(result.kriterler.color_palette.puan, 70);
  assert.equal(result.guven.seviye, 'yüksek');
  assert.equal(result.oneriler.length, 3);
});

test('validateAndNormalize throws when a required criterion is missing', () => {
  const raw = validRaw();
  delete raw.kriterler.accessories;
  assert.throws(() => validateAndNormalize(raw), /accessories.*eksik/);
});

test('validateAndNormalize throws when genel_izlenim has the wrong type', () => {
  const raw = validRaw({ genel_izlenim: 12345 });
  assert.throws(() => validateAndNormalize(raw), /genel_izlenim/);
});

test('validateAndNormalize throws when puan is missing', () => {
  const raw = validRaw({ puan: undefined });
  assert.throws(() => validateAndNormalize(raw), /puan/);
});

test('validateAndNormalize clamps a criterion score below 0', () => {
  const raw = validRaw();
  raw.kriterler.accessories.puan = -20;
  const result = validateAndNormalize(raw);
  assert.equal(result.kriterler.accessories.puan, 0);
});

test('validateAndNormalize clamps a criterion score above 100', () => {
  const raw = validRaw();
  raw.kriterler.accessories.puan = 150;
  const result = validateAndNormalize(raw);
  assert.equal(result.kriterler.accessories.puan, 100);
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

test('validateAndNormalize corrects an incorrect model total score to the weighted recalculation', () => {
  // weights: 30/25/20/15/10 over 100,100,100,100,0 => 90
  const raw = validRaw({
    puan: 40, // model's claimed total is way off
    kriterler: {
      color_palette: { puan: 100, aciklama: '' },
      style_cohesion: { puan: 100, aciklama: '' },
      fit_and_silhouette: { puan: 100, aciklama: '' },
      seasonal_suitability: { puan: 100, aciklama: '' },
      accessories: { puan: 0, aciklama: '' },
    },
  });
  const result = validateAndNormalize(raw);
  assert.equal(result.puan, 90);
});

test('validateAndNormalize keeps the model score when within tolerance of the recalculation', () => {
  const raw = validRaw({
    puan: 92, // recalculated is 90; within SCORE_TOLERANCE of 3
    kriterler: {
      color_palette: { puan: 100, aciklama: '' },
      style_cohesion: { puan: 100, aciklama: '' },
      fit_and_silhouette: { puan: 100, aciklama: '' },
      seasonal_suitability: { puan: 100, aciklama: '' },
      accessories: { puan: 0, aciklama: '' },
    },
  });
  const result = validateAndNormalize(raw);
  assert.equal(result.puan, 92);
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
