// server/src/services/appointment.postgres.service.js
// appointment.service.js'in (Firestore) PostgreSQL karşılığı — slot çakışma
// mantığı BİREBİR aynı, sadece appointmentRepository → appointmentPostgresRepository.
import { appointmentPostgresRepository } from "../repositories/appointment.postgres.repository.js";
import { createDefaultAppointment } from "../models/appointment.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

const SLOT_MINUTES = 60;

export async function listAppointments(context) {
  return appointmentPostgresRepository.findAll(context);
}

function slotBucketStart(timestamp) {
  const d = new Date(timestamp);
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  const bucketMinutes = Math.floor(totalMinutes / SLOT_MINUTES) * SLOT_MINUTES;
  const bucketStart = new Date(d);
  bucketStart.setHours(Math.floor(bucketMinutes / 60), bucketMinutes % 60, 0, 0);
  return bucketStart.getTime();
}

async function assertNoConflict(context, dateTime, excludeId) {
  const slotMs = SLOT_MINUTES * 60 * 1000;
  const bucketStart = slotBucketStart(dateTime);
  const nearby = await appointmentPostgresRepository.findByDateRange(context, bucketStart, bucketStart + slotMs);
  const conflict = nearby.some((a) => a.id !== excludeId);
  if (conflict) {
    throw ApiError.conflict("Bu saat dilimi dolu — başka bir randevu zaten var. Lütfen başka bir saat seçin.");
  }
}

// `customerId`/`listingId` artık GERÇEK foreign key (Firestore'da hiç yoktu,
// bkz. migrations). Bir native <select> "seçim yok" durumunda genelde boş
// string ("") gönderir — Firestore'da bu zararsız bir "hiçbir zaman
// eşleşmeyen" string'di, Postgres'te ise FK ihlaliyle patlar. Boş string'i
// NULL'a normalize etmek ikisinin de gerçek anlamı olan "seçili değil"
// durumunu doğru temsil ediyor.
function normalizeReferenceFields(data) {
  const copy = { ...data };
  if (copy.customerId === "") copy.customerId = null;
  if (copy.listingId === "") copy.listingId = null;
  return copy;
}

export async function createAppointment(context, data) {
  await assertNoConflict(context, data.dateTime, null);
  return appointmentPostgresRepository.create(context, normalizeReferenceFields(createDefaultAppointment(data)));
}

export async function updateAppointment(context, id, updates) {
  if (updates.dateTime) {
    await assertNoConflict(context, updates.dateTime, id);
  }
  return appointmentPostgresRepository.update(
    context,
    id,
    withUpdateFields(normalizeReferenceFields(updates), { actorUserId: context.userId }),
  );
}

export async function deleteAppointment(context, id) {
  return appointmentPostgresRepository.softDelete(context, id);
}
