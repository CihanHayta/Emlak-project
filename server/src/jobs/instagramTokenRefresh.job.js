// server/src/jobs/instagramTokenRefresh.job.js
//
// Instagram'ın uzun ömürlü token'ları ~60 gün sonra dolar, ilk 24 saatten
// sonra istenildiği zaman yenilenebilir. Günde bir kere: süresi yaklaşan
// (10 gün içinde dolacak) tüm tenant'ların token'ını yeniler. Ayrı bir
// cron kütüphanesi (node-cron vb.) EKLENMEDİ — tek, uzun süre çalışan
// Railway process'inde `setInterval` yeterli, projenin "minimal bağımlılık"
// tarzıyla tutarlı.
import { getTenantsWithExpiringInstagramToken, connectTenantInstagram } from "../services/tenant.service.js";
import { refreshLongLivedToken } from "../services/instagramOAuth.service.js";
import { encryptToken, decryptToken } from "../utils/crypto.util.js";
import { logger } from "../config/logger.js";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // günde bir
const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000; // süresi dolmasına 10 günden az kalanlar

async function refreshExpiringTokens() {
  const expiringTenants = await getTenantsWithExpiringInstagramToken(Date.now() + REFRESH_WINDOW_MS);

  for (const tenant of expiringTenants) {
    try {
      const currentToken = decryptToken(tenant.instagram.accessToken);
      // eslint-disable-next-line no-await-in-loop -- tenant başına bağımsız bir dış API çağrısı, art arda çalışsa da sorun değil (günde bir kere tetikleniyor).
      const refreshed = await refreshLongLivedToken(currentToken);
      // eslint-disable-next-line no-await-in-loop
      await connectTenantInstagram(tenant.id, {
        ...tenant.instagram,
        accessToken: encryptToken(refreshed.accessToken),
        tokenExpiresAt: Date.now() + refreshed.expiresInSeconds * 1000,
      });
      logger.info(`Instagram token yenilendi: tenant=${tenant.id}`);
    } catch (error) {
      // Bir tenant'ın token'ı yenilenemezse diğerlerini etkilemesin — token
      // süresi dolarsa o tenant'ın gönderim/webhook işlemleri ayrıca hata
      // verip fark edilecek, burada sessizce durmak akışı bozmaz.
      logger.error(`Instagram token yenileme hatası: tenant=${tenant.id} — ${error.message}`);
    }
  }
}

export function startInstagramTokenRefreshJob() {
  refreshExpiringTokens().catch((error) => logger.error("Instagram token yenileme işi başlatılamadı: " + error.message));
  setInterval(() => {
    refreshExpiringTokens().catch((error) => logger.error("Instagram token yenileme işi hatası: " + error.message));
  }, CHECK_INTERVAL_MS).unref();
}
