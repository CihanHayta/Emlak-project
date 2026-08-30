// server/tests/postgres/funnel.postgres.service.test.js — tests/funnel.service.test.js ile paralel.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createFunnel, updateFunnel, getPublicFunnelBySlug, listFunnels, deleteFunnel } = await import(
  "../../src/services/funnel.postgres.service.js"
);

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

describe("funnel.postgres.service — slug benzersizliği ve public görünürlük", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it("slug verilmezse isimden otomatik üretir", async () => {
    const funnel = await createFunnel(context, { name: "Yaz Kampanyası 2026" });
    expect(funnel.slug).toBe("yaz-kampanyasi-2026");
  });

  it("aynı slug ikinci kez kullanılamaz (servis KATMANI + DB unique index çift güvence)", async () => {
    await createFunnel(context, { name: "Kampanya", slug: "yaz-2026" });
    await expect(createFunnel(context, { name: "Başka Kampanya", slug: "yaz-2026" })).rejects.toThrow(/kullanılıyor/);
  });

  it("geçersiz/boş slug reddedilir", async () => {
    await expect(createFunnel(context, { name: "!!!", slug: "" })).rejects.toThrow(/adres/);
  });

  it("güncellerken kendi slug'ıyla çakışma saymaz", async () => {
    const funnel = await createFunnel(context, { name: "Kampanya", slug: "yaz-2026" });
    await expect(updateFunnel(context, funnel.id, { slug: "yaz-2026", headline: "Yeni başlık" })).resolves.toMatchObject({
      headline: "Yeni başlık",
    });
  });

  it("güncellerken BAŞKA bir funnel'ın slug'ıyla çakışırsa reddeder", async () => {
    await createFunnel(context, { name: "Kampanya 1", slug: "kampanya-1" });
    const funnel2 = await createFunnel(context, { name: "Kampanya 2", slug: "kampanya-2" });
    await expect(updateFunnel(context, funnel2.id, { slug: "kampanya-1" })).rejects.toThrow(/kullanılıyor/);
  });

  it("draft (yayınlanmamış) funnel public'te null döner — sızdırmaz", async () => {
    const funnel = await createFunnel(context, { name: "Taslak", slug: "taslak" });
    expect(funnel.status).toBe("draft");
    expect(await getPublicFunnelBySlug(context, "taslak")).toBeNull();
  });

  it("published funnel public'te görünür", async () => {
    const funnel = await createFunnel(context, { name: "Yayında", slug: "yayinda" });
    await updateFunnel(context, funnel.id, { status: "published" });
    const result = await getPublicFunnelBySlug(context, "yayinda");
    expect(result?.slug).toBe("yayinda");
  });

  it("silinen funnel listede görünmez (soft delete)", async () => {
    const funnel = await createFunnel(context, { name: "Silinecek", slug: "silinecek" });
    await deleteFunnel(context, funnel.id);
    expect((await listFunnels(context)).find((f) => f.id === funnel.id)).toBeUndefined();
  });
});
