// server/tests/postgres/lead.postgres.service.test.js
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createLead, listLeads, updateLeadStatus, deleteLead } = await import("../../src/services/lead.postgres.service.js");
// AŞAMA 11: "newLeadWelcome otomasyonu açık" senaryosu tests/lead.service.test.js'ten
// buraya taşındı — bkz. o dosyanın kalan yorumu.
const { createDefaultTenant } = await import("../../src/models/tenant.model.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { customerPostgresRepository } = await import("../../src/repositories/customer.postgres.repository.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
const publicContext = { tenantId: "test-tenant", userId: null, role: "public" };

// property.postgres.service.test.js'teki AYNI gerekçe — notifyNewLead
// floating promise, artık GERÇEK Postgres I/O içeriyor.
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 150));
}

describe("lead.postgres.service", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it("kimliksiz (public) context ile lead oluşturulabilir", async () => {
    const lead = await createLead(publicContext, { name: "Ali", phone: "0555", message: "Merhaba" });
    expect(lead.status).toBe("Yeni");
  });

  it("durum güncellenebilir", async () => {
    const lead = await createLead(context, { name: "Ali", phone: "0555" });
    const updated = await updateLeadStatus(context, lead.id, "Arandı");
    expect(updated.status).toBe("Arandı");
  });

  it("olmayan bir lead'in durumunu güncellemeye çalışınca NotFound fırlatır", async () => {
    await expect(updateLeadStatus(context, "olmayan-id", "Arandı")).rejects.toThrow(/bulunamadı/);
  });

  it("silinen lead listede görünmez", async () => {
    const lead = await createLead(context, { name: "Silinecek", phone: "0555" });
    await deleteLead(context, lead.id);
    expect((await listLeads(context)).find((l) => l.id === lead.id)).toBeUndefined();
  });
});

describe("lead.postgres.service — newLeadWelcome otomasyonu", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
  });
  afterAll(() => closeTestPool());

  it("otomasyon açık bir tenant'ta: müşteri otomatik oluşur, lead 'Müşteri Oldu' olarak işaretlenir", async () => {
    const tenant = await tenantRepo.createTenant(
      createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }),
    );
    const automations = { ...tenant.automations, newLeadWelcome: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } };
    await tenantRepo.updateTenant(tenant.id, { automations });
    const tenantPublicContext = { tenantId: tenant.id, userId: null, role: "public" };
    const tenantOwnerContext = { tenantId: tenant.id, userId: "owner1", role: "owner" };

    const lead = await createLead(tenantPublicContext, { name: "Ayşe Kaya", phone: "0555 987 65 43" });
    await flushMicrotasks();

    const customers = await customerPostgresRepository.findAll(tenantOwnerContext);
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe("Ayşe Kaya");

    const updatedLead = await listLeads(tenantOwnerContext).then((leads) => leads.find((l) => l.id === lead.id));
    expect(updatedLead.status).toBe("Müşteri Oldu");
  });
});
