# Nasıl Olmuşum AI — Kombin Değerlendirmesi

Kombin fotoğrafı yükleyip Claude'a (Anthropic) sert ama adil bir üslupla değerlendirtir. Build aracı gerektirmez: React, Babel ve Tailwind doğrudan CDN üzerinden tarayıcıda çalışır. Anthropic API anahtarı, tarayıcıya hiç gönderilmeyen bir Cloudflare Worker proxy'sinde tutulur (bkz. `proxy/`).

Canlı adres: https://danismanik.pages.dev

## Kurulum (yerel geliştirme)

`config.js` zaten depoda ve çalışan proxy adresiyle dolu, ekstra bir şey yapmanıza gerek yok. Farklı bir proxy kullanmak isterseniz `config.example.js`'i şablon olarak alıp `config.js`'i düzenleyin:
```js
window.APP_CONFIG = {
  apiProxyUrl: "https://autumn-cell-5bba.emrezdgn.workers.dev/",
  model: "claude-sonnet-5",
};
```

## Yerelde çalıştırma

Bu proje `fetch`/ES module kullandığı için `index.html`'i çift tıklayıp doğrudan açmak çalışmaz (tarayıcılar `file://` sayfalarından ağ isteklerini engeller). Basit bir yerel sunucu üzerinden açılması gerekir:

```
npx serve .
```
veya
```
python3 -m http.server 5500
```
sonra tarayıcıda verilen adresi (ör. `http://localhost:5500`) açın.

## İnternette yayınlama / güncelleme

Site Cloudflare Pages'te (`danismanik.pages.dev`), proxy Cloudflare Workers'ta (`proxy/README.md`) yayında. Depo GitHub'a bağlı (`emrezdgn-sketch/kiyafet-danismani`) ama push'ların otomatik deploy tetiklemesi güvenilir çalışmadı; bu yüzden güncelleme için Wrangler CLI kullanın:

```
npx wrangler pages deploy . --project-name=danismanik
```

(İlk seferde `npx wrangler login` ile tarayıcıdan giriş istenir.)

Proxy kodunda (`proxy/worker.js`) değişiklik yaparsanız:
```
npx wrangler deploy proxy/worker.js --name autumn-cell-5bba --compatibility-date 2026-01-01
```

## Güvenlik notu

Anahtar Worker'ın Secret ayarında saklanıyor, tarayıcıya hiç ulaşmıyor. Yine de proxy kimlik doğrulaması yapmadığı için Anthropic Console'da ([console.anthropic.com](https://console.anthropic.com) → Settings → Limits) bir harcama sınırı koymanız önerilir.

## Dosyalar

- `index.html` — sayfa iskeleti; Tailwind, Google Fonts, React/Babel/lucide-react için CDN bağlantıları ve import map.
- `app.jsx` — asıl uygulama (bileşen + proxy üzerinden Anthropic API çağrısı).
- `config.js` — proxy adresiniz (gizli bilgi içermez, depoya commit edilir).
- `config.example.js` — `config.js` şablonu, farklı bir proxy'ye geçmek isteyenler için.
- `proxy/worker.js` — Cloudflare Worker proxy kodu (API anahtarını sunucu tarafında saklar).
- `proxy/README.md` — proxy ve Pages kurulum adımları.
