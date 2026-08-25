// Bu dosyayı "config.js" olarak kopyalayın ve apiProxyUrl'i doldurun.
// config.js .gitignore'da olduğu için commit edilmez.
//
// apiProxyUrl: Cloudflare Worker proxy'nizin adresi (bkz. proxy/README.md).
// Anthropic API anahtarınız artık burada değil, Worker'ın Secret ayarında
// tutuluyor — bu dosyada gizli hiçbir şey yok, güvenle paylaşılabilir.
window.APP_CONFIG = {
  apiProxyUrl: "https://kiyafet-danismani-proxy.KULLANICI-ADINIZ.workers.dev",
  model: "claude-sonnet-5",
};
