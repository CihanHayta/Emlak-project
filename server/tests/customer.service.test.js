// server/tests/customer.service.test.js
import { createCustomer, getCustomer, addTimelineEntry, deleteCustomer, listCustomers } from "../src/services/customer.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

describe("customer.service", () => {
  beforeEach(() => resetMockFirestore());

  it("olmayan bir müşteriyi getirmeye çalışınca NotFound fırlatır", async () => {
    await expect(getCustomer(context, "olmayan-id")).rejects.toThrow(/bulunamadı/);
  });

  it("yeni müşteri varsayılan bir timeline girdisiyle oluşur", async () => {
    const customer = await createCustomer(context, { name: "Ahmet Yılmaz", phone: "05551234567" });
    expect(customer.timeline).toHaveLength(1);
    expect(customer.timeline[0].label).toBe("Müşteri kartı oluşturuldu");
  });

  it("addTimelineEntry mevcut timeline'ın SONUNA ekler, üzerine yazmaz", async () => {
    const customer = await createCustomer(context, { name: "Ahmet Yılmaz" });
    const updated = await addTimelineEntry(context, customer.id, "Randevu oluşturuldu");

    expect(updated.timeline).toHaveLength(2);
    expect(updated.timeline[0].label).toBe("Müşteri kartı oluşturuldu");
    expect(updated.timeline[1].label).toBe("Randevu oluşturuldu");
  });

  it("her timeline girdisinin benzersiz bir id'si ve zaman damgası olur", async () => {
    const customer = await createCustomer(context, { name: "Ahmet Yılmaz" });
    const updated = await addTimelineEntry(context, customer.id, "İkinci not");
    const [first, second] = updated.timeline;

    expect(first.id).not.toBe(second.id);
    expect(typeof second.at).toBe("number");
  });

  it("silinen müşteri listede görünmez (soft delete)", async () => {
    const customer = await createCustomer(context, { name: "Silinecek" });
    await deleteCustomer(context, customer.id);
    const all = await listCustomers(context);
    expect(all.find((c) => c.id === customer.id)).toBeUndefined();
  });
});
