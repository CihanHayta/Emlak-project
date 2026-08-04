/**
 * Randevu takviminin saat-slot hesaplamaları — AppointmentFormDialog'daki
 * takvim (dolu/müsait gün) ve saat seçici (dolu/müsait slot) burada
 * paylaşılan tek bir yerden besleniyor, ikisi de aynı WORKING_HOURS
 * sabitini (bkz. data/constants.js) kullanıyor. Backend'deki çakışma
 * kontrolü (server/src/services/appointment.service.js) de kavramsal
 * olarak aynı "slotMinutes içindeyse çakışır" kuralını uyguluyor — ikisi
 * ayrı paket olduğu için elle senkron tutuluyor.
 */
import { setHours, setMinutes, setSeconds, setMilliseconds, isSameDay } from "date-fns";
import { WORKING_HOURS } from "../data/constants";

/** Günün çalışma-saati slotlarının başlangıç saatlerini döner, örn. [{hour:9,minute:0}, {hour:10,minute:0}, ...]. */
export function getDaySlots() {
  const { startHour, endHour, slotMinutes } = WORKING_HOURS;
  const slots = [];
  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += slotMinutes) {
    slots.push({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
  }
  return slots;
}

/** Bir gün + slot'u gerçek bir Date'e çevirir (o slotun başlangıç anı). */
export function getSlotDateTime(day, slot) {
  let d = setHours(day, slot.hour);
  d = setMinutes(d, slot.minute);
  d = setSeconds(d, 0);
  d = setMilliseconds(d, 0);
  return d;
}

/** Herhangi bir zaman damgasını, içinde bulunduğu slotun başlangıç dakikasına yuvarlar — bir randevunun "hangi slotta" olduğunu bulmak için. */
function slotBucketMinutes(timestamp) {
  const { slotMinutes } = WORKING_HOURS;
  const d = new Date(timestamp);
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  return Math.floor(totalMinutes / slotMinutes) * slotMinutes;
}

/** Bu slot, verilen randevu listesinde (kendisi hariç) dolu mu? */
export function isSlotTaken(day, slot, appointments, excludeId) {
  const slotBucket = slot.hour * 60 + slot.minute;
  return appointments.some(
    (a) =>
      a.id !== excludeId &&
      isSameDay(a.dateTime, day) &&
      slotBucketMinutes(a.dateTime) === slotBucket,
  );
}

/** Takvimde günü kapatmak (disabled) için — o günün TÜM çalışma-saati slotları doluysa true. */
export function isDayFullyBooked(day, appointments, excludeId) {
  return getDaySlots().every((slot) => isSlotTaken(day, slot, appointments, excludeId));
}
