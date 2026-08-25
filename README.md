# Nasıl Olmuşum AI — Kombin Değerlendirmesi

Kombin fotoğrafı yükleyip Claude'a (Anthropic) sert ama adil bir üslupla değerlendirtir. Build aracı gerektirmez: React, Babel ve Tailwind doğrudan CDN üzerinden tarayıcıda çalışır. Anthropic API anahtarı, tarayıcıya hiç gönderilmeyen bir Cloudflare Worker proxy'sinde tutulur (bkz. `proxy/`).

Canlı adres: https://danismanik.pages.dev

## Kurulum (yerel geliştirme)

1. `config.example.js` dosyasını `config.js` olarak kopyalayın.
2. Proxy zaten kurulu (`proxy/README.md`); Worker'ın adresini `config.js`'e yazın:
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

Site şu an Cloudflare Pages'te (`danismanik.pages.dev`), proxy Cloudflare Workers'ta (`proxy/README.md`) yayında. Bu depo GitHub'a bağlıysa `main`'e her push otomatik olarak siteyi günceller. Değilse, Cloudflare Pages projesinin "Create deployment" ekranından dosyaları elle yeniden yükleyin.

Proxy kodunda (`proxy/worker.js`) değişiklik yaparsanız, Cloudflare Worker'ın "Edit code" ekranına elle yapıştırıp yeniden Deploy etmeniz gerekir (Worker'lar git entegrasyonuna bağlı değildir).

## Güvenlik notu

Anahtar Worker'ın Secret ayarında saklanıyor, tarayıcıya hiç ulaşmıyor. Yine de proxy kimlik doğrulaması yapmadığı için Anthropic Console'da ([console.anthropic.com](https://console.anthropic.com) → Settings → Limits) bir harcama sınırı koymanız önerilir.

## Dosyalar

- `index.html` — sayfa iskeleti; Tailwind, Google Fonts, React/Babel/lucide-react için CDN bağlantıları ve import map.
- `app.jsx` — asıl uygulama (bileşen + proxy üzerinden Anthropic API çağrısı).
- `config.js` — proxy adresiniz (gizli bilgi içermez, ama yine de `.gitignore`'da).
- `config.example.js` — `config.js` şablonu.
- `proxy/worker.js` — Cloudflare Worker proxy kodu (API anahtarını sunucu tarafında saklar).
- `proxy/README.md` — proxy ve Pages kurulum adımları.
