// server/tests/lead.service.test.js
import { createLead, updateLeadStatus, deleteLead, listLeads } from "../src/services/lead.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
// Public site'tan (kimliksiz) gelen bir form gönderimini simüle eder —
// lead.service.js'in doc'unda özellikle belirtilen, userId'siz senaryo.
const publicContext = { tenantId: "test-tenant", userId: null, role: null };

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
});
