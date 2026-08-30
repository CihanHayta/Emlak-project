// server/src/jobs/whatsappTokenRefresh.job.js
//
// instagramTokenRefresh.job.js ile aynı günlük çalışma deseni — ama
// WhatsApp Embedded Signup'ın System User token'ları için Instagram'daki
// gibi belgelenmiş basit bir "refresh_access_token" uç noktası YOK (bkz.
// whatsappOAuth.service.js'in başındaki not). Bu yüzden bu iş token'ı
// OTOMATİK yenilemeye çalışmaz — sadece süresi yaklaşan tenant'ları loglar,
// böylece ofis sahibi/biz Ayarlar sayfasından elle "yeniden bağlan" yapabilir.
// Meta'nın güncel dokümantasyonu gerçek bir refresh akışı sunuyorsa, bu iş
// instagramTokenRefresh.job.js ile aynı şekilde otomatik yenilemeye
// genişletilebilir.
import { getTenantsWithExpiringWhatsappToken } from "../services/tenant.service.js";
import { logger } from "../config/logger.js";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // günde bir
const WARNING_WINDOW_MS = 10 * 24 * 60 * 60 * 1000; // süresi dolmasına 10 günden az kalanlar

async function warnExpiringTokens() {
  const expiringTenants = await getTenantsWithExpiringWhatsappToken(Date.now() + WARNING_WINDOW_MS);
  for (const tenant of expiringTenants) {
    logger.warn(
      `WhatsApp token süresi yaklaşıyor: tenant=${tenant.id} — Ayarlar > Entegrasyonlar'dan yeniden bağlanması gerekebilir.`,
    );
  }
}

export function startWhatsappTokenRefreshJob() {
  warnExpiringTokens().catch((error) => logger.error("WhatsApp token kontrolü başlatılamadı: " + error.message));
  setInterval(() => {
    warnExpiringTokens().catch((error) => logger.error("WhatsApp token kontrolü hatası: " + error.message));
  }, CHECK_INTERVAL_MS).unref();
}
