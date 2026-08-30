// server/src/models/appointment.model.js
import { withCreateFields } from "./base.model.js";

/** Frontend'deki appointmentStore.js ile birebir aynı alan seti (listing enrichment hariç — o frontend'de, properties.js üzerinden yapılıyor). */
export function createDefaultAppointment(data) {
  const defaults = {
    customerId: null,
    serviceType: "İlan Gösterimi",
    listingId: null,
    dateTime: Date.now(),
    status: "Beklemede", // Beklemede | Onaylandı | Tamamlandı | İptal Edildi
    note: "",
    // Randevu Hatırlatması otomasyonu (bkz. jobs/appointmentReminders.job.js)
    // gönderdiğinde/hazırladığında doldurur — aynı randevu için job'ın
    // farklı çalıştırmalarında (ör. sunucu yeniden başlarsa) ikinci bir
    // hatırlatma/event OLUŞTURMAMASI için idempotency anahtarı.
    reminderSentAt: null,
  };
  return withCreateFields({ ...defaults, ...data });
}
