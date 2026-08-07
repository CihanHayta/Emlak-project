// src/admin/lib/appointmentSlots.test.js
//
// 2026-08-05'te elle bulunan bir sınır-hesaplama hatasını (backend'deki
// appointment.service.js ile aynı köke sahip — bkz. server/tests/appointment.service.test.js'in
// açıklaması) kalıcı bir regresyon testine çeviriyor.
import { describe, it, expect } from "vitest";
import { getDaySlots, getSlotDateTime, isSlotTaken, isDayFullyBooked } from "./appointmentSlots";

describe("getDaySlots", () => {
  it("09:00-18:00 arası 60 dakikalık slotlar üretir (WORKING_HOURS varsayılanı)", () => {
    const slots = getDaySlots();
    expect(slots[0]).toEqual({ hour: 9, minute: 0 });
    expect(slots[slots.length - 1]).toEqual({ hour: 17, minute: 0 });
    expect(slots).toHaveLength(9);
  });
});

describe("isSlotTaken", () => {
  const day = new Date("2026-09-01T00:00:00");

  it("aynı slotta bir randevu varsa dolu sayar", () => {
    const appointments = [{ id: "a1", dateTime: new Date("2026-09-01T09:00:00").getTime() }];
    expect(isSlotTaken(day, { hour: 9, minute: 0 }, appointments)).toBe(true);
  });

  it("bir sonraki slotu YANLIŞLIKLA dolu saymaz (regresyon)", () => {
    const appointments = [{ id: "a1", dateTime: new Date("2026-09-01T09:00:00").getTime() }];
    expect(isSlotTaken(day, { hour: 10, minute: 0 }, appointments)).toBe(false);
  });

  it("kendi id'si hariç tutulunca (düzenleme modu) kendi slotunu dolu saymaz", () => {
    const appointments = [{ id: "a1", dateTime: new Date("2026-09-01T09:00:00").getTime() }];
    expect(isSlotTaken(day, { hour: 9, minute: 0 }, appointments, "a1")).toBe(false);
  });

  it("farklı bir gündeki aynı saatteki randevuyu çakışma saymaz", () => {
    const appointments = [{ id: "a1", dateTime: new Date("2026-09-02T09:00:00").getTime() }];
    expect(isSlotTaken(day, { hour: 9, minute: 0 }, appointments)).toBe(false);
  });

  it("slotun ORTASINDAKİ bir randevu zamanı da doğru bucket'a düşer", () => {
    // 09:37 -> 09:00 slot'una ait olmalı (60dk'lık bucket).
    const appointments = [{ id: "a1", dateTime: new Date("2026-09-01T09:37:00").getTime() }];
    expect(isSlotTaken(day, { hour: 9, minute: 0 }, appointments)).toBe(true);
    expect(isSlotTaken(day, { hour: 10, minute: 0 }, appointments)).toBe(false);
  });
});

describe("isDayFullyBooked", () => {
  const day = new Date("2026-09-01T00:00:00");

  it("boş bir gün dolu sayılmaz", () => {
    expect(isDayFullyBooked(day, [])).toBe(false);
  });

  it("tüm çalışma saatleri doluysa gün dolu sayılır", () => {
    const appointments = getDaySlots().map((slot, i) => ({
      id: `a${i}`,
      dateTime: getSlotDateTime(day, slot).getTime(),
    }));
    expect(isDayFullyBooked(day, appointments)).toBe(true);
  });

  it("bir slot bile boşsa gün dolu sayılmaz", () => {
    const slots = getDaySlots();
    const appointments = slots.slice(1).map((slot, i) => ({
      id: `a${i}`,
      dateTime: getSlotDateTime(day, slot).getTime(),
    }));
    expect(isDayFullyBooked(day, appointments)).toBe(false);
  });
});

describe("getSlotDateTime", () => {
  it("verilen günün tarihini korur, sadece saat/dakikayı slot'a göre ayarlar", () => {
    const day = new Date("2026-09-01T00:00:00");
    const result = getSlotDateTime(day, { hour: 14, minute: 30 });
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8); // 0-indexli, Eylül
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
  });
});
