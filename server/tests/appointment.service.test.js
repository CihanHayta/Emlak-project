// server/tests/appointment.service.test.js
//
// 2026-08-05'te elle bulunan bir sınır-hesaplama hatasını (bir sonraki saat
// dilimindeki GEÇERLİ bir randevu yanlışlıkla "çakışıyor" sayılıyordu —
// simetrik ±slotMs pencere yerine slot-bucket karşılaştırması gerekiyordu)
// kalıcı bir regresyon testine çeviriyor — bkz. appointment.service.js#slotBucketStart.
import { createAppointment } from "../src/services/appointment.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

function baseAppointment(overrides) {
  return { customerId: "c1", serviceType: "İlan Gösterimi", listingId: "", status: "Beklemede", note: "", ...overrides };
}

describe("appointment.service — saat dilimi çakışma kontrolü", () => {
  beforeEach(() => resetMockFirestore());

  it("aynı slotta (60dk içinde) ikinci randevuyu reddeder", async () => {
    const day = new Date("2026-09-01T09:00:00").getTime();
    await createAppointment(context, baseAppointment({ dateTime: day }));

    await expect(createAppointment(context, baseAppointment({ dateTime: day + 15 * 60 * 1000, customerId: "c2" }))).rejects.toThrow(
      /dolu/,
    );
  });

  it("bir sonraki saat dilimindeki randevuyu kabul eder (regresyon: sınır hesaplama hatası)", async () => {
    const day = new Date("2026-09-01T09:00:00").getTime();
    await createAppointment(context, baseAppointment({ dateTime: day }));

    const next = await createAppointment(context, baseAppointment({ dateTime: day + 60 * 60 * 1000, customerId: "c2" }));
    expect(next.id).toBeDefined();
  });

  it("farklı günlerdeki aynı saatteki randevuları çakışma saymaz", async () => {
    const day1 = new Date("2026-09-01T09:00:00").getTime();
    const day2 = new Date("2026-09-02T09:00:00").getTime();
    await createAppointment(context, baseAppointment({ dateTime: day1 }));

    const second = await createAppointment(context, baseAppointment({ dateTime: day2, customerId: "c2" }));
    expect(second.id).toBeDefined();
  });

  it("düzenlerken kendi mevcut randevusuyla çakışma saymaz", async () => {
    const day = new Date("2026-09-01T09:00:00").getTime();
    const appointment = await createAppointment(context, baseAppointment({ dateTime: day }));

    const { updateAppointment } = await import("../src/services/appointment.service.js");
    await expect(updateAppointment(context, appointment.id, { dateTime: day, note: "güncellendi" })).resolves.toBeDefined();
  });
});
