// server/tests/property.service.test.js
import { jest } from "@jest/globals";
import { createProperty, getProperty, deleteProperty, listProperties, updateProperty } from "../src/services/property.service.js";
import { propertyRepository } from "../src/repositories/property.repository.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { mockStorage } from "../src/firebase/mock/storage.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

function baseProperty(overrides) {
  return {
    category: "satilik",
    type: "Daire",
    title: "Test İlan",
    price: "1.500.000 TL",
    district: "Kadıköy",
    neighborhood: "Moda",
    ...overrides,
  };
}

describe("property.service", () => {
  let deleteFileSpy;

  beforeEach(() => {
    resetMockFirestore();
    deleteFileSpy = jest.spyOn(mockStorage, "deleteFile").mockResolvedValue(undefined);
  });

  afterEach(() => {
    deleteFileSpy.mockRestore();
  });

  it("olmayan bir ilanı getirmeye çalışınca NotFound fırlatır", async () => {
    await expect(getProperty(context, "olmayan-id")).rejects.toThrow(/bulunamadı/);
  });

  it("silinen ilan listede görünmez (soft delete)", async () => {
    const property = await createProperty(context, baseProperty({}));
    await deleteProperty(context, property.id);
    const all = await listProperties(context);
    expect(all.find((p) => p.id === property.id)).toBeUndefined();
  });

  it("silme sırasında BİZİM Storage'ımızdaki fotoğraflar gerçekten silinir", async () => {
    const property = await createProperty(
      context,
      baseProperty({
        images: [
          "http://localhost:4000/mock-uploads/tenants/test-tenant/properties/abc123.jpg",
          "http://localhost:4000/mock-uploads/tenants/test-tenant/properties/def456.jpg",
        ],
      }),
    );

    await deleteProperty(context, property.id);

    expect(deleteFileSpy).toHaveBeenCalledWith("tenants/test-tenant/properties/abc123.jpg");
    expect(deleteFileSpy).toHaveBeenCalledWith("tenants/test-tenant/properties/def456.jpg");
    expect(deleteFileSpy).toHaveBeenCalledTimes(2);
  });

  it("dış (Unsplash vb.) URL'ler için silme denemesi yapmaz", async () => {
    const property = await createProperty(
      context,
      baseProperty({ images: ["https://images.unsplash.com/photo-123.jpg"] }),
    );

    await deleteProperty(context, property.id);

    expect(deleteFileSpy).not.toHaveBeenCalled();
  });

  it("başka bir tenant'ın path'ine benzeyen URL silinmeye çalışılmaz (tenant izolasyonu)", async () => {
    const property = await createProperty(
      context,
      baseProperty({ images: ["http://localhost:4000/mock-uploads/tenants/BASKA-TENANT/properties/x.jpg"] }),
    );

    await deleteProperty(context, property.id);

    expect(deleteFileSpy).not.toHaveBeenCalled();
  });

  it("video URL'i de fotoğraflarla birlikte silinir", async () => {
    const property = await createProperty(
      context,
      baseProperty({ videoUrl: "http://localhost:4000/mock-uploads/tenants/test-tenant/properties/video.mp4" }),
    );

    await deleteProperty(context, property.id);

    expect(deleteFileSpy).toHaveBeenCalledWith("tenants/test-tenant/properties/video.mp4");
  });
});

describe("property.service — taslak/yayın (status) görünürlüğü (2026-08-13 fix)", () => {
  const publicContext = { tenantId: "test-tenant", userId: null, role: "public" };

  beforeEach(() => resetMockFirestore());

  it("status belirtilmezse varsayılan olarak 'published' — public'te görünür", async () => {
    const property = await createProperty(context, baseProperty({}));
    expect(property.status).toBe("published");
    const publicList = await listProperties(publicContext);
    expect(publicList.some((p) => p.id === property.id)).toBe(true);
  });

  it("status='unpublished' iken public listede GÖRÜNMEZ", async () => {
    const property = await createProperty(context, baseProperty({ status: "unpublished" }));
    const publicList = await listProperties(publicContext);
    expect(publicList.some((p) => p.id === property.id)).toBe(false);
  });

  it("status='unpublished' iken admin listesinde HÂLÂ görünür (kendi ilanını görebilmeli)", async () => {
    const property = await createProperty(context, baseProperty({ status: "unpublished" }));
    const adminList = await listProperties(context);
    expect(adminList.some((p) => p.id === property.id)).toBe(true);
  });

  it("status='unpublished' iken public GET /properties/:id 'bulunamadı' fırlatır", async () => {
    const property = await createProperty(context, baseProperty({ status: "unpublished" }));
    await expect(getProperty(publicContext, property.id)).rejects.toThrow(/bulunamadı/);
  });

  it("published olarak güncellenince public'te tekrar görünür", async () => {
    const property = await createProperty(context, baseProperty({ status: "unpublished" }));
    await updateProperty(context, property.id, { status: "published" });
    const publicList = await listProperties(publicContext);
    expect(publicList.some((p) => p.id === property.id)).toBe(true);
  });

  it("eski (status alanı hiç olmayan) bir ilan public'te görünmeye devam eder (geriye dönük uyum)", async () => {
    // createProperty/createDefaultProperty'yi BİLEREK atlayıp doğrudan
    // repository'ye yazıyoruz — bu migration'dan ÖNCEKİ gerçek seed
    // kayıtlarını (status alanı hiç yok) birebir simüle eder. `deletedAt:
    // null` elle eklenmeli — withCreateFields'i atladığımız için
    // repository'nin `deletedAt == null` sorgusu bu alan hiç yoksa kaydı
    // hiçbir listede göstermez (base.model.js'in kendi yorumunda da yazıyor).
    const legacy = await propertyRepository.create(context, { ...baseProperty({}), deletedAt: null });
    const publicList = await listProperties(publicContext);
    expect(publicList.some((p) => p.id === legacy.id)).toBe(true);
  });
});
