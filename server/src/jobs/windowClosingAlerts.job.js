// server/src/jobs/windowClosingAlerts.job.js
//
// instagramTokenRefresh.job.js / appointmentReminders.job.js ile aynı
// desen (setInterval, hemen bir ilk çalıştırma, .unref(), tenant başına
// try/catch). Asıl mantık automation.service.js#checkClosingWindows'ta —
// bu dosya sadece "her N dakikada bir, her tenant için çağır" iskeletini
// sağlıyor.
import { getTenantsWithFirebaseConnected } from "../services/tenant.service.js";
import { checkClosingWindows } from "../services/automation.service.js";
import { logger } from "../config/logger.js";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 dakikada bir — mesai içi "cevap bekliyor" durumu hızlı değişebilir, appointmentReminders ile aynı sıklık.

/** export edildi — bkz. tests/windowClosingAlerts.job.test.js. */
export async function checkAllTenants() {
  const tenants = await getTenantsWithFirebaseConnected();
  for (const tenant of tenants) {
    if (!tenant.automations?.windowClosingAlert?.enabled) continue;
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    try {
      // eslint-disable-next-line no-await-in-loop -- tenant başına bağımsız iş; diğerini bekletmesi 15 dakikada bir tetiklenen bir iş için sorun değil.
      await checkClosingWindows(context, tenant);
    } catch (error) {
      logger.error(`24 saat penceresi uyarı işi hatası: tenant=${tenant.id} — ${error.message}`);
    }
  }
}

export function startWindowClosingAlertsJob() {
  checkAllTenants().catch((error) => logger.error("24 saat penceresi uyarı işi başlatılamadı: " + error.message));
  setInterval(() => {
    checkAllTenants().catch((error) => logger.error("24 saat penceresi uyarı işi hatası: " + error.message));
  }, CHECK_INTERVAL_MS).unref();
}
