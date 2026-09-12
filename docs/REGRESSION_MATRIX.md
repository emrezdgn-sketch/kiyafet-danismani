# Regression Matrix — Nasıl Olmuşum AI

> Her fazda bu akışların çalışmaya devam ettiği doğrulanmalıdır.
> Snapshot: 2026-09-12 · Commit: `0c22a44`

## Critical Flows

| ID | Flow | Steps | Expected |
|----|------|-------|----------|
| T01 | Photo upload (gallery) | "Galeriden Seç" → pick JPEG | Photo appears in preview, blur circle visible |
| T02 | Photo upload (camera) | "Fotoğraf Çek" → capture | Same as T01 |
| T03 | Photo upload (drag-drop) | Drag image file onto drop zone | Drop zone highlights, photo loads on drop |
| T04 | File type rejection | Select a .txt or .pdf file | Error banner: "Bu bir resim dosyası değil..." |
| T05 | Face blur drag | Drag center handle, drag edge handle | Circle moves / resizes, preview updates |
| T06 | Face blur toggle | Uncheck "Yüzümü bulanıklaştır" | Blur circle disappears, original shown |
| T07 | Single analysis | Upload photo → "Kombini Değerlendir" | Loading spinner → score + criteria + suggestions displayed |
| T08 | Single analysis with occasion | Select "İş / Toplantı" → analyze | Result reflects work context in evaluation |
| T09 | Compare mode | Switch to "İki Kombini Karşılaştır" → upload A + B → "İkisini Karşılaştır" | Both scored, winner declared, side-by-side results |
| T10 | Share result | After analysis → "Sonucu Paylaş" | Mobile: share sheet with PNG card. Desktop: PNG download |
| T11 | History | Complete analysis → check history strip | Thumbnail + score appears at top; persists across reload |
| T12 | Error handling | Analyze with invalid/expired API key | Error banner with message, not a crash |

## Secondary Flows

| ID | Flow | Steps | Expected |
|----|------|-------|----------|
| S01 | Dark mode | Toggle system theme to dark | Colors invert via CSS custom properties, no JS reload |
| S02 | PWA install | Visit on mobile Chrome → "Add to Home Screen" | manifest.json used, correct icons and name |
| S03 | Reset single | After results → "Başka Bir Kombin Dene" | Photo cleared, back to upload state |
| S04 | Reset compare | After compare results → "Yeni Karşılaştırma" | Both photos cleared |
| S05 | History clear | "Temizle" in history strip → confirm | History emptied, localStorage cleared |
| S06 | Keyboard blur control | Tab to blur handles → arrow keys | Center moves or radius changes |
| S07 | Photo locked after analysis | View results → check photo panel | No blur handles, no X button, no checkbox |
| S08 | Auto-scroll to results | Complete analysis on mobile | Page scrolls to results section |
| S09 | Confidence badge | Hover/click "i" button on güven badge | Tooltip with explanation appears |
| S10 | Max tokens error | API returns stop_reason: "max_tokens" | Error: "Yanıt yarıda kesildi" |

## Boundary Conditions

| ID | Condition | Expected |
|----|-----------|----------|
| B01 | Very large image (>5000px) | Resized to max 1568px, no crash |
| B02 | HEIC image (iPhone) | Loaded correctly (browser-dependent) |
| B03 | localStorage full | History save fails silently, app continues |
| B04 | CDN down (esm.sh/unpkg) | Blank page (known limitation pre-Phase 2) |
| B05 | Worker ANTHROPIC_API_KEY missing | Error: "Worker tarafında ANTHROPIC_API_KEY ayarlanmamış" |
| B06 | Anthropic API error (429/500) | Error banner with API error message |
| B07 | Malformed JSON from model | Regex fallback `/{[\s\S]*}/` extraction attempted |
| B08 | Score outside 0-100 | Clamped by `Math.max(0, Math.min(100, ...))` |

## Phase-Specific Checkpoints

### After Phase 1 (Worker Security)
- T07, T08, T09 still work (request construction moved to Worker)
- B05, B06 still show correct errors
- New: invalid image type rejected by Worker (not just client)
- New: rate limit returns 429 with meaningful message

### After Phase 2 (Vite Migration)
- All T01-T12 work with bundled assets (no CDN dependency)
- B04 no longer applicable (CDNs removed)
- Dev server: `npm run dev` starts, hot reload works
- Production build: `npm run build` produces working dist/

### After Phase 3 (Modularization)
- All T01-T12 unchanged (refactor, no behavior change)
- Import paths resolve correctly in Vite
- No circular dependencies

### After Phase 4 (API Contract Validation)
- T07: response validated against schema
- B07: improved error message for malformed responses
- New: weighted score recalculated client-side, mismatch detected
