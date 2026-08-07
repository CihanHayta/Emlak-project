// server/tests/funnel.service.test.js
import {
  createFunnel,
  updateFunnel,
  getPublicFunnelBySlug,
  listFunnels,
  deleteFunnel,
} from "../src/services/funnel.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

describe("funnel.service — slug benzersizliği ve public görünürlük", () => {
  beforeEach(() => resetMockFirestore());

  it("slug verilmezse isimden otomatik üretir", async () => {
    const funnel = await createFunnel(context, { name: "Yaz Kampanyası 2026" });
    expect(funnel.slug).toBe("yaz-kampanyasi-2026");
  });

  it("aynı slug ikinci kez kullanılamaz", async () => {
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

  it("olmayan bir slug public'te null döner", async () => {
    expect(await getPublicFunnelBySlug(context, "yok-boyle-bir-sey")).toBeNull();
  });

  it("silinen funnel listede görünmez (soft delete)", async () => {
    const funnel = await createFunnel(context, { name: "Silinecek", slug: "silinecek" });
    await deleteFunnel(context, funnel.id);
    const all = await listFunnels(context);
    expect(all.find((f) => f.id === funnel.id)).toBeUndefined();
  });
});
