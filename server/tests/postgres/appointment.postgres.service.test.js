// server/tests/postgres/appointment.postgres.service.test.js — tests/appointment.service.test.js ile paralel (aynı regresyon senaryosu).
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createAppointment, updateAppointment } = await import("../../src/services/appointment.postgres.service.js");
const { customerPostgresRepository } = await import("../../src/repositories/customer.postgres.repository.js");
const { createDefaultCustomer } = await import("../../src/models/customer.model.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

function baseAppointment(overrides) {
  return { customerId: "c1", serviceType: "İlan Gösterimi", listingId: "", status: "Beklemede", note: "", ...overrides };
}

// appointments.customer_id artık gerçek bir FOREIGN KEY (bkz. migrations/tenant/
// ..._create-appointments-table.js — Firestore'da hiç yoktu, bu Aşama 2/3'te
// bilerek eklenen bir veri bütünlüğü iyileştirmesi). Testlerin referans
// verdiği "c1"/"c2" artık GERÇEKTEN var olan satırlar olmalı.
async function seedCustomers() {
  await customerPostgresRepository.createWithId(context, "c1", createDefaultCustomer({ name: "C1", phone: "0555" }));
  await customerPostgresRepository.createWithId(context, "c2", createDefaultCustomer({ name: "C2", phone: "0555" }));
}

describe("appointment.postgres.service — saat dilimi çakışma kontrolü", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    await seedCustomers();
  });
  afterAll(() => closeTestPool());

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

    await expect(updateAppointment(context, appointment.id, { dateTime: day, note: "güncellendi" })).resolves.toBeDefined();
  });
});
