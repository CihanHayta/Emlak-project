// server/src/jobs/appointmentReminders.job.js
//
// instagramTokenRefresh.job.js ile aynı zamanlama deseni (setInterval,
// hemen bir ilk çalıştırma, .unref(), tenant başına try/catch) — ama
// backupTenants.job.js'in "sabit saatte çalış" (setTimeout self-reschedule)
// deseni DEĞİL, çünkü burada sabit bir saat yok, sadece "her N dakikada
// bir pencereyi kontrol et" yeterli ve iş zaten idempotent (reminderSentAt).
//
// Her tenant kendi Firebase projesinde yaşadığı için (bkz.
// backupTenants.job.js'in aynı yorumu) tüm tenant'lar için TEK bir sorgu
// yok — getTenantsWithFirebaseConnected() ile enumerate edip her biri için
// ayrı ayrı appointmentRepository.findByDateRange çağrılır.
import { getTenantsWithFirebaseConnected } from "../services/tenant.service.js";
import { appointmentRepository } from "../repositories/appointment.repository.js";
import { sendAppointmentReminders } from "../services/automation.service.js";
import { logger } from "../config/logger.js";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 dakikada bir

async function processTenant(tenant) {
  const settings = tenant.automations?.appointmentReminder;
  if (!settings?.enabled || !tenant.whatsapp) return;

  const hoursBeforeMs = settings.hoursBefore * 60 * 60 * 1000;
  const windowStart = Date.now() + hoursBeforeMs;
  const windowEnd = windowStart + CHECK_INTERVAL_MS;

  const context = { tenantId: tenant.id, userId: null, role: "system" };
  const appointments = await appointmentRepository.findByDateRange(context, windowStart, windowEnd);
  const due = appointments.filter((appointment) => !appointment.reminderSentAt && appointment.status !== "İptal Edildi");
  if (due.length === 0) return;

  await sendAppointmentReminders(context, tenant, due);

  // Gönderim/hazırlama BAŞARILI ya da BAŞARISIZ olsun, reminderSentAt
  // işaretlenir — asıl amaç aynı randevu için iki kez event/mesaj
  // oluşturulmasını önlemek (ör. job'un bir sonraki 15 dakikalık
  // penceresi bu randevuyu tekrar yakalarsa). automation.service.js zaten
  // başarısız gönderimi ayrı bir "failed" event'iyle kayıt altına alıyor.
  for (const appointment of due) {
    // eslint-disable-next-line no-await-in-loop -- randevu başına bağımsız güncelleme, günde birkaç kez tetiklenen bir iş için paralelleştirmeye değmez.
    await appointmentRepository.update(context, appointment.id, { reminderSentAt: Date.now() }).catch((error) => {
      logger.error(`Randevu hatırlatma işaretleme hatası: tenant=${tenant.id} appointment=${appointment.id} — ${error.message}`);
    });
  }
}

/** export edildi — bkz. tests/appointmentReminders.job.test.js. */
export async function checkAllTenants() {
  const tenants = await getTenantsWithFirebaseConnected();
  for (const tenant of tenants) {
    try {
      // eslint-disable-next-line no-await-in-loop -- tenant başına bağımsız iş; diğerini bekletmesi 15 dakikada bir tetiklenen bir iş için sorun değil.
      await processTenant(tenant);
    } catch (error) {
      logger.error(`Randevu hatırlatma işi hatası: tenant=${tenant.id} — ${error.message}`);
    }
  }
}

export function startAppointmentRemindersJob() {
  checkAllTenants().catch((error) => logger.error("Randevu hatırlatma işi başlatılamadı: " + error.message));
  setInterval(() => {
    checkAllTenants().catch((error) => logger.error("Randevu hatırlatma işi hatası: " + error.message));
  }, CHECK_INTERVAL_MS).unref();
}
