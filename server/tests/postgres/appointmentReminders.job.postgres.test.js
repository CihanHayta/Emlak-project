// server/tests/postgres/appointmentReminders.job.postgres.test.js
// tests/appointmentReminders.job.test.js'in AŞAMA 11 karşılığı — appointments
// artık Postgres'te (bkz. jobs/appointmentReminders.job.js'in kendi yorumu).
// AŞAMA (File Store kaldırma): tenant fixture'ları da artık Postgres.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createDefaultTenant } = await import("../../src/models/tenant.model.js");
const { createDefaultCustomer } = await import("../../src/models/customer.model.js");
const { createDefaultAppointment } = await import("../../src/models/appointment.model.js");
const { encryptToken } = await import("../../src/utils/crypto.util.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { customerPostgresRepository: customerRepository } = await import("../../src/repositories/customer.postgres.repository.js");
const { appointmentPostgresRepository: appointmentRepository } = await import("../../src/repositories/appointment.postgres.repository.js");
const { automationEventPostgresRepository: automationEventRepository } = await import(
  "../../src/repositories/automationEvent.postgres.repository.js"
);
const { checkAllTenants } = await import("../../src/jobs/appointmentReminders.job.js");

async function makeTenant({ hoursBefore = 2 } = {}) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = {
    ...tenant.automations,
    appointmentReminder: { enabled: true, hoursBefore, templateStatus: "not_submitted", templateName: null, templateMetaId: null },
  };
  const whatsapp = { phoneNumberId: "pn-1", wabaId: "waba-1", accessToken: encryptToken("fake-token"), displayPhoneNumber: "+905550000000" };
  await tenantRepo.updateTenant(tenant.id, { automations, whatsapp });
  return { ...tenant, automations, whatsapp };
}

describe("appointmentReminders.job (Postgres) — checkAllTenants", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
  });
  afterAll(() => closeTestPool());

  it("hatırlatma penceresine düşen bir randevu için otomasyon event'i oluşturur ve reminderSentAt'i işaretler", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    const appointment = await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 + 60 * 1000 }));

    await checkAllTenants();

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("appointmentReminder");

    const updatedAppointment = await appointmentRepository.findById(context, appointment.id);
    expect(updatedAppointment.reminderSentAt).not.toBeNull();
  });

  it("aynı randevu için job İKİNCİ kez çalışınca TEKRAR event oluşturmaz (idempotency)", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 + 60 * 1000 }));

    await checkAllTenants();
    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("penceresi henüz gelmemiş bir randevu için hiçbir şey yapmaz", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 10 * 60 * 60 * 1000 }));

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("otomasyon kapalıyken hiçbir tenant için işlem yapmaz", async () => {
    const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Kapalı Ofis", slug: `kapali-${Date.now()}`, ownerUserId: "owner1" }));
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 }));

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("iptal edilmiş bir randevu için hatırlatma göndermez", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 + 60 * 1000, status: "İptal Edildi" }));

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});
