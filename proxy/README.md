# Proxy kurulumu (Cloudflare Worker)

Bu klasördeki `worker.js`, Anthropic API anahtarınızı tarayıcıdan gizleyen küçük bir sunucudur. Zaten deploy edildi: `https://autumn-cell-5bba.emrezdgn.workers.dev/`.

## Kod güncellemek isterseniz

Repo kökündeki `wrangler.toml`, Cloudflare'in Git entegrasyonunun Worker'ı nereden
(`proxy/worker.js`) ve hangi ada (`autumn-cell-5bba`) deploy edeceğini bilmesi
için var — bu dosya olmadan git push'larda otomatik build "wrangler
config bulunamadı" diyerek başarısız oluyordu. Yani `proxy/worker.js`'e
push yaptığınızda artık otomatik deploy oluyor; API anahtarı (Secret)
deploy'lardan etkilenmeden Worker üzerinde kalıyor.

Elle deploy etmek isterseniz Wrangler CLI:

```
npx wrangler deploy proxy/worker.js --name autumn-cell-5bba --compatibility-date 2026-01-01
```

(İlk çalıştırmada `npx wrangler login` ile tarayıcıdan Cloudflare hesabınıza giriş yapmanız istenir.)

Ya da dashboard'dan elle:

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → `autumn-cell-5bba` → **Edit code**.
2. Bu klasördeki `worker.js`'in güncel içeriğini yapıştırın.
3. **Deploy**.

## API anahtarı

Worker'ın **Settings → Variables and Secrets → ANTHROPIC_API_KEY** alanında Secret olarak duruyor. Değiştirmek isterseniz aynı ekrandan güncelleyip Deploy edin.

## CORS (ALLOWED_ORIGIN)

`worker.js` içindeki `ALLOWED_ORIGIN` sabiti, proxy'yi hangi sitenin çağırabileceğini belirler — şu an `https://danismanik.pages.dev`. Site adresi değişirse (örn. yeni bir Pages projesine geçilirse) bu satırı güncelleyip Worker'ı yeniden deploy etmeniz gerekir, yoksa istekler CORS hatasıyla engellenir.

## Güvenlik notu

Worker, adresini bilen herkesin isteğini Anthropic'e iletir — kimlik doğrulaması yok. CORS ayarı yalnızca *tarayıcı üzerinden* başka sitelerin çağırmasını engeller, doğrudan bir script'in Worker adresine curl atmasını engellemez. Bu yüzden:

- Anthropic Console'da ([console.anthropic.com](https://console.anthropic.com) → Settings → Limits) bir **harcama sınırı** koyun.
- Worker URL'nizi herkese açık paylaşmayın.
- İsterseniz Cloudflare Dashboard → Security → **Rate Limiting Rules** ile Worker adresinize dakikada/saatte istek sınırı da ekleyebilirsiniz (kod gerektirmez, panelden kurulur).
