# Architecture Baseline — Nasıl Olmuşum AI

> Snapshot: 2026-09-12 · Commit: `0c22a44` (main)

## 1. Runtime Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (client)                                        │
│                                                          │
│  index.html                                              │
│    ├── CDN: Tailwind (cdn.tailwindcss.com)                │
│    ├── CDN: Babel Standalone (unpkg)                      │
│    ├── CDN: React 18.3.1 + ReactDOM + lucide-react       │
│    │       (esm.sh, via <script type="importmap">)        │
│    ├── config.js  → APP_CONFIG { apiProxyUrl, model }     │
│    └── app.jsx    → <script type="text/babel">            │
│         (1570 satır, tüm UI + iş mantığı)                │
│                                                          │
│  İstemci tarafı işlemler:                                │
│    • fileToImage() → FileReader → base64                 │
│    • applyFaceBlur() → <canvas> resize + blur            │
│    • drawShareCard() → <canvas> → PNG blob               │
│    • localStorage (geçmiş, 12 kayıt)                     │
└───────────────┬──────────────────────────────────────────┘
                │ POST (JSON: model, max_tokens,
                │        system[prompt+cache], messages[image+occasion])
                ▼
┌──────────────────────────────────────────────────────────┐
│  Cloudflare Worker — proxy/worker.js (89 satır)          │
│                                                          │
│  • CORS: ALLOWED_ORIGIN = 'https://danismanik.pages.dev' │
│  • Origin eşleşmezse → CORS header yok (tarayıcı engel) │
│  • İstek gövdesi olduğu gibi Anthropic'e iletilir        │
│  • API anahtarı: env.ANTHROPIC_API_KEY (Worker Secret)    │
│  • Kimlik doğrulama yok, rate limit yok                  │
│  • İstek doğrulama yok (model, max_tokens kontrol yok)   │
└───────────────┬──────────────────────────────────────────┘
                │ POST + x-api-key header
                ▼
┌──────────────────────────────────────────────────────────┐
│  Anthropic API  (api.anthropic.com/v1/messages)          │
│  • claude-sonnet-5                                       │
│  • Vision (base64 image)                                 │
│  • Prompt caching (cache_control: ephemeral)             │
└──────────────────────────────────────────────────────────┘
```

## 2. Data Flow

### 2.1 Single Outfit Analysis
```
User picks photo
  → fileToImage() converts to base64 dataUrl
  → usePhotoEditor() stores rawImage (never leaves browser)
  → applyFaceBlur() creates safeImage via <canvas>
     (resize to max 1568px, optional circular blur, JPEG 0.85)
  → User clicks "Kombini Değerlendir"
  → runAnalysis() POSTs to Worker proxy:
      { model, max_tokens: 2400,
        system: [{ text: PROMPT, cache_control: {type:"ephemeral"} }],
        messages: [{ role:"user", content: [image, ?occasion_hint] }] }
  → Worker forwards to Anthropic API
  → Response JSON parsed, JSON block extracted
  → Result rendered (ScoreHoop, CriterionRow×5, suggestions)
  → makeThumbnail() → localStorage history entry
```

### 2.2 Compare Mode
```
Two photos loaded via two independent usePhotoEditor() instances
  → Promise.all([runAnalysis(A), runAnalysis(B)])
  → compareVerdict() determines winner by puan
  → Both results rendered side-by-side
  → Both added to history
```

### 2.3 Share Flow
```
buildShareCardBlob() → <canvas> 1080×1350
  → drawShareCard() renders photo + score badge + summary
  → navigator.share({ files }) on mobile
  → <a download> fallback on desktop
```

## 3. State Ownership

| State | Owner | Persistence |
|-------|-------|-------------|
| rawImage (original photo) | usePhotoEditor() useState | Session only, never transmitted |
| safeImage (blurred/resized) | usePhotoEditor() useState | Session only, sent to API |
| faceBlurEnabled, blurCenter, blurRadius | usePhotoEditor() useState | Session only |
| mode (single/compare) | OutfitStylist useState | Session only |
| occasion | OutfitStylist useState | Session only |
| status, result | OutfitStylist useState | Session only |
| compareStatus, compareResult | OutfitStylist useState | Session only |
| history (12 entries) | OutfitStylist useState + localStorage | Persistent (device-local) |
| sharing | OutfitStylist useState | Session only |
| APP_CONFIG | window global (config.js) | Static, loaded at page load |

## 4. External Dependencies

| Dependency | Source | Pinned Version | Failure Impact |
|------------|--------|---------------|----------------|
| React | esm.sh | 18.3.1 | App won't render |
| ReactDOM | esm.sh | 18.3.1 | App won't render |
| lucide-react | esm.sh | 0.469.0 | Icons missing |
| Babel Standalone | unpkg | @7 (major only) | JSX won't compile, blank page |
| Tailwind CSS | cdn.tailwindcss.com | latest (unpinned) | Utility classes fail, broken layout |
| Plus Jakarta Sans | Google Fonts | latest | Falls back to system sans-serif |
| Anthropic API | api.anthropic.com | 2023-06-01 | Analysis fails (graceful error) |

**Risk:** esm.sh, unpkg, or cdn.tailwindcss.com outage = blank page or broken UI. No offline fallback. Babel unpinned at major version. Tailwind completely unpinned.

## 5. Security Boundaries

| Boundary | Current Protection | Gap |
|----------|-------------------|-----|
| API key exposure | Worker Secret, never in client code | None — this is solid |
| Proxy abuse (non-browser) | CORS Origin check only | curl/Postman bypasses trivially; no rate limit, no auth |
| Request injection | None — client sends full Anthropic request body | Client can override model, max_tokens, prompt; Worker blindly forwards |
| Image privacy | Client-side blur + resize before send | User can disable blur; this is by design |
| localStorage | Same-origin isolation | XSS would expose history thumbnails |
| config.js | Proxy URL public (no secret) | Correct — secret is in Worker |

## 6. Cost Path

```
Per single analysis:
  System prompt (~4.5K tokens) → cached after first call (cache_control: ephemeral)
    First call:  ~4.5K input tokens × $3/M = ~$0.014
    Cached call: ~4.5K input tokens × $0.30/M = ~$0.0014
  Image: base64 JPEG ≤1568px → ~1000-2500 tokens (varies)
  Output: ~800-1200 tokens (JSON response)
  Estimated cost per call: ~$0.005-0.015

Per compare: 2× single (parallel, share cache if within TTL)

Cost controls:
  ✓ Prompt caching (cache_control: ephemeral, 5 min TTL)
  ✓ Image resize to max 1568px before send
  ✓ JPEG compression (quality 0.85)
  ✗ No rate limiting on Worker
  ✗ No per-user quotas
  ✗ No max_tokens validation server-side
  ✗ Anthropic spending limit is only defense (manual setup in console)
```

## 7. File Map

```
/
├── index.html          59 lines   Entry point, CDN imports, meta tags, PWA
├── app.jsx           1570 lines   ALL application code (see breakdown below)
├── config.js            7 lines   Runtime config (proxy URL, model name)
├── config.example.js   10 lines   Template for config.js
├── manifest.json       14 lines   PWA manifest
├── wrangler.toml        3 lines   Cloudflare Worker build config
├── .gitignore           2 lines   node_modules, .wrangler
├── README.md                      Project README
├── icons/
│   ├── icon-192.png              PWA icon 192×192
│   ├── icon-512.png              PWA icon 512×512
│   ├── icon-512-maskable.png     PWA maskable icon
│   └── apple-touch-icon.png      iOS home screen icon
├── proxy/
│   ├── worker.js       89 lines   Cloudflare Worker (API proxy)
│   └── README.md                  Worker setup instructions
└── docs/
    ├── ARCHITECTURE_BASELINE.md   This file
    └── REGRESSION_MATRIX.md       Critical flow test matrix
```

### app.jsx Breakdown (1570 lines, single file)

| Lines | Section | Responsibility |
|-------|---------|----------------|
| 1-3 | Imports | React, ReactDOM, lucide-react icons |
| 5-102 | Constants & Styles | C (CSS vars), SHADOW, STYLES (<style> JSX) |
| 105-150 | PROMPT | Full system prompt (~150 lines of Turkish text) |
| 152-160 | CRITERIA | 5 weighted criteria definitions |
| 162-221 | History utils | loadHistory, saveHistory, makeThumbnail, fileToImage |
| 223-271 | Image processing | MAX_IMAGE_DIMENSION, applyFaceBlur (canvas resize+blur) |
| 273-300 | Score utils | SCORE_TIERS, scoreTier, SHARE_PALETTE |
| 302-429 | Share card | drawCoverImage, wrapLines, drawShareCard, buildShareCardBlob |
| 431-463 | ScoreHoop | SVG ring score display component |
| 465-547 | CriterionRow, ConfidenceBadge | Score breakdown UI components |
| 549-605 | ErrorBanner, SectionLabel, HistoryStrip | Utility UI components |
| 607-792 | usePhotoEditor | Custom hook: file load, blur, drag handles, keyboard |
| 794-833 | OccasionPicker | Occasion/context selector component |
| 835-1034 | PhotoSlot | Photo upload zone + blur overlay + preview |
| 1036-1092 | runAnalysis | API call to Worker proxy |
| 1094-1101 | compareVerdict | Compare two results by score |
| 1103-1107 | Config | APP_CONFIG, ANTHROPIC_MODEL globals |
| 1108-1566 | OutfitStylist | Main component: all state, analyze, compare, share, render |
| 1568-1569 | Mount | createRoot + render |
