// server/src/jobs/leadResponseAlerts.job.js
//
// windowClosingAlerts.job.js ile aynı desen (setInterval, hemen bir ilk
// çalıştırma, .unref(), tenant başına try/catch). Asıl mantık
// automation.service.js#checkLeadResponseAlerts'te — bu dosya sadece
// "her N dakikada bir, her tenant için çağır" iskeletini sağlıyor.
import { getTenantsWithFirebaseConnected } from "../services/tenant.service.js";
import { checkLeadResponseAlerts } from "../services/automation.service.js";
import { logger } from "../config/logger.js";

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 5-10 dakikalık eşiği zamanında yakalamak için windowClosingAlerts'ten (15dk) daha sık.

/** export edildi — bkz. tests/leadResponseAlerts.job.test.js. */
export async function checkAllTenants() {
  const tenants = await getTenantsWithFirebaseConnected();
  for (const tenant of tenants) {
    if (!tenant.automations?.leadResponseAlert?.enabled) continue;
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    try {
      // eslint-disable-next-line no-await-in-loop -- tenant başına bağımsız iş; diğerini bekletmesi 2 dakikada bir tetiklenen bir iş için sorun değil.
      await checkLeadResponseAlerts(context, tenant);
    } catch (error) {
      logger.error(`Lead yanıt uyarı işi hatası: tenant=${tenant.id} — ${error.message}`);
    }
  }
}

export function startLeadResponseAlertsJob() {
  checkAllTenants().catch((error) => logger.error("Lead yanıt uyarı işi başlatılamadı: " + error.message));
  setInterval(() => {
    checkAllTenants().catch((error) => logger.error("Lead yanıt uyarı işi hatası: " + error.message));
  }, CHECK_INTERVAL_MS).unref();
}
