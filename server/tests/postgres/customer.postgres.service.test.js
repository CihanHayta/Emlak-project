// server/tests/postgres/customer.postgres.service.test.js — tests/customer.service.test.js ile paralel.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createCustomer, getCustomer, listCustomers, updateCustomer, deleteCustomer, addTimelineEntry } = await import(
  "../../src/services/customer.postgres.service.js"
);

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
const otherTenant = { tenantId: "other-tenant", userId: "u2", role: "owner" };

describe("customer.postgres.service", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it("TEXT[] (interests/tags) doğru yazılıp okunur", async () => {
    const created = await createCustomer(context, { name: "Ahmet", phone: "0555", interests: ["Daire", "Villa"], tags: ["VIP"] });
    expect(created.interests).toEqual(["Daire", "Villa"]);
    expect(created.tags).toEqual(["VIP"]);
  });

  it("oluşturulunca varsayılan bir timeline girdisi olur (JSONB round-trip)", async () => {
    const created = await createCustomer(context, { name: "Ahmet", phone: "0555" });
    expect(created.timeline).toHaveLength(1);
    expect(created.timeline[0].label).toBe("Müşteri kartı oluşturuldu");
  });

  it("addTimelineEntry mevcut timeline'ın üzerine ekler, üzerine yazmaz", async () => {
    const created = await createCustomer(context, { name: "Ahmet", phone: "0555" });
    const updated = await addTimelineEntry(context, created.id, "Arandı");
    expect(updated.timeline).toHaveLength(2);
    expect(updated.timeline[1].label).toBe("Arandı");
  });

  it("silinen müşteri listede görünmez", async () => {
    const created = await createCustomer(context, { name: "Silinecek", phone: "0555" });
    await deleteCustomer(context, created.id);
    expect((await listCustomers(context)).find((c) => c.id === created.id)).toBeUndefined();
  });

  it("IDOR: başka tenant bu müşteriyi göremez/güncelleyemez", async () => {
    const created = await createCustomer(context, { name: "Ahmet", phone: "0555" });
    await expect(getCustomer(otherTenant, created.id)).rejects.toThrow(/bulunamadı/);
    await expect(updateCustomer(otherTenant, created.id, { name: "Ele geçirildi" })).rejects.toThrow();
  });
});
