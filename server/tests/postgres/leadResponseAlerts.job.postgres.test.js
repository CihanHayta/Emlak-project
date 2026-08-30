// server/tests/postgres/leadResponseAlerts.job.postgres.test.js
// tests/leadResponseAlerts.job.test.js'in AŞAMA 11 karşılığı — leads/customers
// artık Postgres'te. AŞAMA (File Store kaldırma): tenant fixture'ları da artık Postgres.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createDefaultTenant } = await import("../../src/models/tenant.model.js");
const { createDefaultLead } = await import("../../src/models/lead.model.js");
const { createDefaultCustomer } = await import("../../src/models/customer.model.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { leadPostgresRepository: leadRepository } = await import("../../src/repositories/lead.postgres.repository.js");
const { customerPostgresRepository: customerRepository } = await import("../../src/repositories/customer.postgres.repository.js");
const { automationEventPostgresRepository: automationEventRepository } = await import(
  "../../src/repositories/automationEvent.postgres.repository.js"
);
const { checkAllTenants } = await import("../../src/jobs/leadResponseAlerts.job.js");

async function makeTenant(leadResponseAlertOverride) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = { ...tenant.automations, leadResponseAlert: leadResponseAlertOverride };
  await tenantRepo.updateTenant(tenant.id, { automations });
  return { ...tenant, automations };
}

describe("leadResponseAlerts.job (Postgres) — checkAllTenants", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => closeTestPool());

  it("otomasyonu açık olan tenant için eşiği geçmiş, hâlâ 'Yeni' durumdaki bir başvuruyu yakalar", async () => {
    const tenant = await makeTenant({ enabled: true, minutesThreshold: 10 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lead = await leadRepository.create(context, createDefaultLead({ name: "Ahmet", phone: "0555 123 45 67" }));
    await leadRepository.update(context, lead.id, { createdAt: new Date(Date.now() - 15 * 60 * 1000) });

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("otomasyonu açık olan tenant için 'Yeni'de kalmış bir müşteri kartını da yakalar", async () => {
    const tenant = await makeTenant({ enabled: true, minutesThreshold: 10 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Zeynep", phone: "0555 123 45 67" }));
    await customerRepository.update(context, customer.id, { createdAt: new Date(Date.now() - 15 * 60 * 1000) });

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("otomasyonu kapalı olan tenant'ları atlar", async () => {
    const tenant = await makeTenant({ enabled: false, minutesThreshold: 10 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const lead = await leadRepository.create(context, createDefaultLead({ name: "Ahmet", phone: "0555 123 45 67" }));
    await leadRepository.update(context, lead.id, { createdAt: new Date(Date.now() - 15 * 60 * 1000) });

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});
