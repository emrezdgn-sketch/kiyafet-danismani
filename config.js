// Bu dosya artık depoya commit ediliyor — içinde gizli bilgi yok, sadece
// herkese açık proxy adresi. API anahtarının kendisi Cloudflare Worker'ın
// Secret ayarında duruyor (bkz. proxy/README.md).
window.APP_CONFIG = {
  apiProxyUrl: "https://autumn-cell-5bba.emrezdgn.workers.dev/",
  model: "claude-sonnet-5",
};
