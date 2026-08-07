// server/tests/property.service.test.js
import { jest } from "@jest/globals";
import { createProperty, getProperty, deleteProperty, listProperties } from "../src/services/property.service.js";
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
