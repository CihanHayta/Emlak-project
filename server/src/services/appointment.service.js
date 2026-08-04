// server/src/services/appointment.service.js
import { appointmentRepository } from "../repositories/appointment.repository.js";
import { createDefaultAppointment } from "../models/appointment.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

// Frontend'deki WORKING_HOURS.slotMinutes (admin/data/constants.js) ile
// AYNI değer olmalı — iki proje ayrı paket olduğu için import edilemiyor,
// elle senkron tutuluyor. Bu sabit sadece "iki randevu ne kadar yakınsa
// çakışma sayılır"ı belirler, çalışma saatlerini ZORLAMAZ (o sadece
// frontend'de hangi slotların gösterileceğine karar verir).
const SLOT_MINUTES = 60;

export async function listAppointments(context) {
  return appointmentRepository.findAll(context);
}

/**
 * `dateTime`'ı içinde bulunduğu slotun BAŞLANGICINA yuvarlar (yerel saat
 * bazında, admin/lib/appointmentSlots.js'teki `slotBucketMinutes` ile aynı
 * mantık) — böylece "±slotMs" gibi simetrik bir pencere yerine tam olarak
 * AYNI slot kutusundaki randevular karşılaştırılır. Simetrik pencere
 * kullanılsaydı, tam olarak bir slot arayla art arda gelen İKİ GEÇERLİ
 * randevu (ör. 09:00 ve 10:00, 60dk'lık slotlarda) birbirine "çakışıyor"
 * sayılırdı — bu sanity-check scriptiyle yakalandı.
 */
function slotBucketStart(timestamp) {
  const d = new Date(timestamp);
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  const bucketMinutes = Math.floor(totalMinutes / SLOT_MINUTES) * SLOT_MINUTES;
  const bucketStart = new Date(d);
  bucketStart.setHours(Math.floor(bucketMinutes / 60), bucketMinutes % 60, 0, 0);
  return bucketStart.getTime();
}

/** `excludeId` verilirse (düzenleme sırasında) o randevunun kendisiyle çakışma sayılmaz. */
async function assertNoConflict(context, dateTime, excludeId) {
  const slotMs = SLOT_MINUTES * 60 * 1000;
  const bucketStart = slotBucketStart(dateTime);
  const nearby = await appointmentRepository.findByDateRange(context, bucketStart, bucketStart + slotMs);
  const conflict = nearby.some((a) => a.id !== excludeId);
  if (conflict) {
    throw ApiError.conflict("Bu saat dilimi dolu — başka bir randevu zaten var. Lütfen başka bir saat seçin.");
  }
}

export async function createAppointment(context, data) {
  await assertNoConflict(context, data.dateTime, null);
  return appointmentRepository.create(context, createDefaultAppointment(data));
}

export async function updateAppointment(context, id, updates) {
  if (updates.dateTime) {
    await assertNoConflict(context, updates.dateTime, id);
  }
  return appointmentRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
}

/** Soft delete (deletedAt) — aynı customers/leads deseni: listeden kalıcı olarak
 * kaybolur ama kayıt denetim/kurtarma için Firestore'da kalır. */
export async function deleteAppointment(context, id) {
  return appointmentRepository.softDelete(context, id);
}
