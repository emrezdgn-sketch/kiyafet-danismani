import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeResponse } from './validate.js';

function canonicalResponse(overrides = {}) {
  return {
    version: 1,
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
    oneriler: ['Kolları sıvayın.'],
    ...overrides,
  };
}

test('assertSafeResponse accepts a valid version 1 canonical response from the Worker', () => {
  assert.doesNotThrow(() => assertSafeResponse(canonicalResponse()));
});

test('assertSafeResponse rejects a response with a missing contract version', () => {
  const data = canonicalResponse();
  delete data.version;
  assert.throws(() => assertSafeResponse(data), /sürüm/);
});

test('assertSafeResponse rejects a response with an unsupported contract version', () => {
  assert.throws(() => assertSafeResponse(canonicalResponse({ version: 2 })), /sürüm/);
});

test('assertSafeResponse never computes or alters the official score', () => {
  const data = canonicalResponse({ puan: 84 });
  const returnValue = assertSafeResponse(data);
  assert.equal(returnValue, undefined);
  assert.equal(data.puan, 84);
});

test('assertSafeResponse rejects a missing puan field', () => {
  const data = canonicalResponse();
  delete data.puan;
  assert.throws(() => assertSafeResponse(data), /puan/);
});

test('assertSafeResponse rejects an out-of-range puan', () => {
  assert.throws(() => assertSafeResponse(canonicalResponse({ puan: 150 })), /puan/);
});

test('assertSafeResponse rejects a missing criterion', () => {
  const data = canonicalResponse();
  delete data.kriterler.accessories;
  assert.throws(() => assertSafeResponse(data), /accessories/);
});

test('assertSafeResponse rejects a non-object payload', () => {
  assert.throws(() => assertSafeResponse(null), /geçersiz/);
  assert.throws(() => assertSafeResponse('a string'), /geçersiz/);
});

test('assertSafeResponse rejects a missing oneriler array', () => {
  const data = canonicalResponse();
  delete data.oneriler;
  assert.throws(() => assertSafeResponse(data), /öneriler/);
});
