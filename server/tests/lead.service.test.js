// server/tests/lead.service.test.js
import { createLead, updateLeadStatus, deleteLead, listLeads } from "../src/services/lead.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { createDefaultTenant } from "../src/models/tenant.model.js";
import * as tenantRepo from "../src/repositories/tenant.repository.js";
import { customerRepository } from "../src/repositories/customer.repository.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
// Public site'tan (kimliksiz) gelen bir form gönderimini simüle eder —
// lead.service.js'in doc'unda özellikle belirtilen, userId'siz senaryo.
const publicContext = { tenantId: "test-tenant", userId: null, role: null };

// notifyNewLead (automation.service.js) createLead'den floating promise
// olarak tetikleniyor — testin bitmeden önce o zincirin (birkaç microtask
// hop'u: getTenantById -> customer oluştur -> event yaz -> updateLeadStatus)
// tamamlanmasını sağlar. Aynı desen property.service.test.js'te de var.
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("lead.service", () => {
  beforeEach(() => resetMockFirestore());

  it("kimliksiz (public) bir başvuru userId olmadan oluşturulabilir", async () => {
    const lead = await createLead(publicContext, { name: "Ayşe Kaya", phone: "05559876543" });
    expect(lead.status).toBe("Yeni");
    expect(lead.createdBy).toBeNull();
  });

  it("kampanyadan gelmeyen bir başvuruda funnelId null olur", async () => {
    const lead = await createLead(publicContext, { name: "Ayşe Kaya", phone: "0555" });
    expect(lead.funnelId).toBeNull();
  });

  it("kampanyadan gelen bir başvuru funnelId'yi taşır", async () => {
    const lead = await createLead(publicContext, { name: "Ayşe Kaya", phone: "0555", funnelId: "funnel-1" });
    expect(lead.funnelId).toBe("funnel-1");
  });

  it("olmayan bir başvurunun durumunu değiştirmeye çalışınca NotFound fırlatır", async () => {
    await expect(updateLeadStatus(context, "olmayan-id", "Onaylandı")).rejects.toThrow(/bulunamadı/);
  });

  it("durum güncellemesi doğru şekilde uygulanır", async () => {
    const lead = await createLead(publicContext, { name: "Ayşe Kaya", phone: "0555" });
    const updated = await updateLeadStatus(context, lead.id, "Görüşüldü");
    expect(updated.status).toBe("Görüşüldü");
  });

  it("silinen başvuru listede görünmez (soft delete)", async () => {
    const lead = await createLead(publicContext, { name: "Silinecek", phone: "0555" });
    await deleteLead(context, lead.id);
    const all = await listLeads(context);
    expect(all.find((l) => l.id === lead.id)).toBeUndefined();
  });

  it("newLeadWelcome otomasyonu açık bir tenant'ta: müşteri otomatik oluşur, lead 'Müşteri Oldu' olarak işaretlenir", async () => {
    const tenant = await tenantRepo.createTenant(
      createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }),
    );
    const automations = { ...tenant.automations, newLeadWelcome: { enabled: true, templateStatus: "not_submitted", templateName: null, templateMetaId: null } };
    await tenantRepo.updateTenant(tenant.id, { automations });
    const tenantPublicContext = { tenantId: tenant.id, userId: null, role: "public" };
    const tenantOwnerContext = { tenantId: tenant.id, userId: "owner1", role: "owner" };

    const lead = await createLead(tenantPublicContext, { name: "Ayşe Kaya", phone: "0555 987 65 43" });
    await flushMicrotasks();

    const customers = await customerRepository.findAll(tenantOwnerContext);
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe("Ayşe Kaya");

    const updatedLead = await listLeads(tenantOwnerContext).then((leads) => leads.find((l) => l.id === lead.id));
    expect(updatedLead.status).toBe("Müşteri Oldu");
  });

  it("newLeadWelcome otomasyonu kapalıyken lead durumu değişmez, hiç müşteri oluşmaz", async () => {
    const tenant = await tenantRepo.createTenant(
      createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }),
    );
    const tenantPublicContext = { tenantId: tenant.id, userId: null, role: "public" };
    const tenantOwnerContext = { tenantId: tenant.id, userId: "owner1", role: "owner" };

    const lead = await createLead(tenantPublicContext, { name: "Ayşe Kaya", phone: "0555 987 65 43" });
    await flushMicrotasks();

    expect(await customerRepository.findAll(tenantOwnerContext)).toHaveLength(0);
    const stillNew = await listLeads(tenantOwnerContext).then((leads) => leads.find((l) => l.id === lead.id));
    expect(stillNew.status).toBe("Yeni");
  });
});
