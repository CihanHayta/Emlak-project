// server/tests/vehicle.service.test.js
import { jest } from "@jest/globals";
import { createVehicle, getVehicle, updateVehicle, deleteVehicle, listVehicles } from "../src/services/vehicle.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { mockStorage } from "../src/firebase/mock/storage.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };
const publicContext = { tenantId: "test-tenant", userId: null, role: "public" };

function baseVehicle(overrides) {
  return {
    category: "satilik",
    brand: "Toyota",
    model: "Corolla",
    year: 2022,
    km: 15000,
    fuelType: "Benzin",
    transmission: "Otomatik",
    title: "2022 Toyota Corolla",
    price: "850.000 TL",
    ...overrides,
  };
}

describe("vehicle.service", () => {
  let deleteFileSpy;

  beforeEach(() => {
    resetMockFirestore();
    deleteFileSpy = jest.spyOn(mockStorage, "deleteFile").mockResolvedValue(undefined);
  });

  afterEach(() => {
    deleteFileSpy.mockRestore();
  });

  it("olmayan bir aracı getirmeye çalışınca NotFound fırlatır", async () => {
    await expect(getVehicle(context, "olmayan-id")).rejects.toThrow(/bulunamadı/);
  });

  it("yeni araç ilanı otomatik bir ilan no ile oluşur", async () => {
    const vehicle = await createVehicle(context, baseVehicle({}));
    expect(vehicle.listingNo).toMatch(/^\d{6}$/);
    expect(vehicle.brand).toBe("Toyota");
  });

  it("güncelleme sadece gönderilen alanları değiştirir", async () => {
    const vehicle = await createVehicle(context, baseVehicle({}));
    const updated = await updateVehicle(context, vehicle.id, { km: 20000 });
    expect(updated.km).toBe(20000);
    expect(updated.brand).toBe("Toyota");
  });

  it("silinen araç listede görünmez (soft delete)", async () => {
    const vehicle = await createVehicle(context, baseVehicle({}));
    await deleteVehicle(context, vehicle.id);
    const all = await listVehicles(context);
    expect(all.find((v) => v.id === vehicle.id)).toBeUndefined();
  });

  it("silme sırasında BİZİM Storage'ımızdaki fotoğraflar gerçekten silinir", async () => {
    const vehicle = await createVehicle(
      context,
      baseVehicle({ images: ["http://localhost:4000/mock-uploads/tenants/test-tenant/vehicles/abc.jpg"] }),
    );
    await deleteVehicle(context, vehicle.id);
    expect(deleteFileSpy).toHaveBeenCalledWith("tenants/test-tenant/vehicles/abc.jpg");
  });

  it("dış URL'ler için silme denemesi yapmaz", async () => {
    const vehicle = await createVehicle(context, baseVehicle({ images: ["https://images.unsplash.com/car.jpg"] }));
    await deleteVehicle(context, vehicle.id);
    expect(deleteFileSpy).not.toHaveBeenCalled();
  });

  it("başka bir tenant'ın path'ine benzeyen URL silinmeye çalışılmaz (tenant izolasyonu)", async () => {
    const vehicle = await createVehicle(
      context,
      baseVehicle({ images: ["http://localhost:4000/mock-uploads/tenants/BASKA-TENANT/vehicles/x.jpg"] }),
    );
    await deleteVehicle(context, vehicle.id);
    expect(deleteFileSpy).not.toHaveBeenCalled();
  });

  it("silme sırasında ekspertiz raporu ve diğer belgeler de Storage'dan silinir", async () => {
    const vehicle = await createVehicle(
      context,
      baseVehicle({
        expertiseReportUrl: "http://localhost:4000/mock-uploads/tenants/test-tenant/document/ekspertiz.pdf",
        documents: [{ type: "servis", url: "http://localhost:4000/mock-uploads/tenants/test-tenant/document/servis.pdf", name: "servis.pdf" }],
      }),
    );
    await deleteVehicle(context, vehicle.id);
    expect(deleteFileSpy).toHaveBeenCalledWith("tenants/test-tenant/document/ekspertiz.pdf");
    expect(deleteFileSpy).toHaveBeenCalledWith("tenants/test-tenant/document/servis.pdf");
  });
});

describe("vehicle.service — admin/public alan ayrımı", () => {
  beforeEach(() => resetMockFirestore());

  it("admin context'te documents/adminNotes görünür", async () => {
    const vehicle = await createVehicle(
      context,
      baseVehicle({ adminNotes: "Ahmet Bey görmek istiyor.", documents: [{ type: "servis", url: "x", name: "y.pdf" }] }),
    );
    const fetched = await getVehicle(context, vehicle.id);
    expect(fetched.adminNotes).toBe("Ahmet Bey görmek istiyor.");
    expect(fetched.documents).toHaveLength(1);
  });

  it("public context'te documents/adminNotes ASLA görünmez", async () => {
    const vehicle = await createVehicle(
      context,
      baseVehicle({ adminNotes: "Gizli not", documents: [{ type: "servis", url: "x", name: "y.pdf" }] }),
    );
    const fetched = await getVehicle(publicContext, vehicle.id);
    expect(fetched.adminNotes).toBeUndefined();
    expect(fetched.documents).toBeUndefined();
  });

  it("public context'te ekspertiz raporu GÖRÜNÜR (bilerek public bir alan)", async () => {
    const vehicle = await createVehicle(
      context,
      baseVehicle({ expertiseReportUrl: "https://x/rapor.pdf", expertiseReportName: "rapor.pdf" }),
    );
    const fetched = await getVehicle(publicContext, vehicle.id);
    expect(fetched.expertiseReportUrl).toBe("https://x/rapor.pdf");
  });

  it("listVehicles de public context'te her araç için admin alanlarını temizler", async () => {
    await createVehicle(context, baseVehicle({ adminNotes: "gizli" }));
    const all = await listVehicles(publicContext);
    expect(all.every((v) => v.adminNotes === undefined)).toBe(true);
  });
});

describe("vehicle.service — ilan durumu (status) görünürlüğü", () => {
  beforeEach(() => resetMockFirestore());

  it('"unpublished" araç admin panelinde hâlâ görünür', async () => {
    const vehicle = await createVehicle(context, baseVehicle({ status: "unpublished" }));
    const fetched = await getVehicle(context, vehicle.id);
    expect(fetched.id).toBe(vehicle.id);
  });

  it('"unpublished" araç public detayında NotFound gibi davranır', async () => {
    const vehicle = await createVehicle(context, baseVehicle({ status: "unpublished" }));
    await expect(getVehicle(publicContext, vehicle.id)).rejects.toThrow(/bulunamadı/);
  });

  it('"unpublished" araç public listede hiç görünmez', async () => {
    const vehicle = await createVehicle(context, baseVehicle({ status: "unpublished" }));
    const all = await listVehicles(publicContext);
    expect(all.find((v) => v.id === vehicle.id)).toBeUndefined();
  });

  it('"sold"/"reserved" araçlar public\'te HÂLÂ görünür (sadece unpublished gizlenir)', async () => {
    const sold = await createVehicle(context, baseVehicle({ status: "sold" }));
    const reserved = await createVehicle(context, baseVehicle({ status: "reserved" }));
    const all = await listVehicles(publicContext);
    expect(all.find((v) => v.id === sold.id)).toBeDefined();
    expect(all.find((v) => v.id === reserved.id)).toBeDefined();
  });
});

describe("vehicle.service — profesyonel ilan sistemi, uçtan uca (tüm yeni alanlar)", () => {
  beforeEach(() => resetMockFirestore());

  it("hasar/donanım/geçmiş/belge alanlarının hepsi oluşturulup doğru kaydediliyor", async () => {
    const created = await createVehicle(
      context,
      baseVehicle({
        bodyType: "Sedan",
        engineSize: "1.6",
        enginePower: "132 HP",
        drivetrain: "Önden Çekiş",
        negotiable: true,
        tradeIn: false,
        creditEligible: true,
        status: "active",
        tramerRecord: "12.500 TL - sol ön çamurluk",
        damageAmount: 12500,
        changedPartsCount: 1,
        paintedPartsCount: 2,
        localPaintedPartsCount: 1,
        partsStatus: [
          { part: "Ön Kaput", status: "Boyalı" },
          { part: "Sol Ön Çamurluk", status: "Değişen" },
          { part: "Sağ Ön Kapı", status: "Orijinal" },
        ],
        equipment: ["Sunroof", "Deri Koltuk", "Geri Görüş Kamerası"],
        history: [
          { date: "2024-03-01", km: 98000, action: "Periyodik bakım", description: "" },
          { date: "2025-06-15", km: 110000, action: "Lastik değişimi", description: "4 adet" },
        ],
        expertiseReportUrl: "https://x/ekspertiz.pdf",
        expertiseReportName: "ekspertiz.pdf",
        documents: [
          { type: "servis", url: "https://x/servis.pdf", name: "servis.pdf" },
          { type: "garanti", url: "https://x/garanti.pdf", name: "garanti.pdf" },
        ],
        adminNotes: "Ahmet Bey aracı görmek istiyor.",
      }),
    );

    // Admin tarafında GERÇEKTEN kaydedildiğini doğrula (tam round-trip).
    const fetched = await getVehicle(context, created.id);
    expect(fetched.bodyType).toBe("Sedan");
    expect(fetched.drivetrain).toBe("Önden Çekiş");
    expect(fetched.negotiable).toBe(true);
    expect(fetched.creditEligible).toBe(true);
    expect(fetched.damageAmount).toBe(12500);
    expect(fetched.partsStatus).toHaveLength(3);
    expect(fetched.partsStatus[1]).toEqual({ part: "Sol Ön Çamurluk", status: "Değişen" });
    expect(fetched.equipment).toEqual(["Sunroof", "Deri Koltuk", "Geri Görüş Kamerası"]);
    expect(fetched.history).toHaveLength(2);
    expect(fetched.history[0].action).toBe("Periyodik bakım");
    expect(fetched.documents).toHaveLength(2);
    expect(fetched.adminNotes).toBe("Ahmet Bey aracı görmek istiyor.");
    expect(fetched.expertiseReportUrl).toBe("https://x/ekspertiz.pdf");

    // Public tarafında hasar/donanım/geçmiş/ekspertiz GÖRÜNÜR (bunlar public
    // bilgi), ama documents/adminNotes GÖRÜNMEZ.
    const publicView = await getVehicle(publicContext, created.id);
    expect(publicView.partsStatus).toHaveLength(3);
    expect(publicView.equipment).toEqual(["Sunroof", "Deri Koltuk", "Geri Görüş Kamerası"]);
    expect(publicView.history).toHaveLength(2);
    expect(publicView.expertiseReportUrl).toBe("https://x/ekspertiz.pdf");
    expect(publicView.documents).toBeUndefined();
    expect(publicView.adminNotes).toBeUndefined();

    // Düzenleme: sadece birkaç alanı güncelle, geri kalanı korunmalı.
    const updated = await updateVehicle(context, created.id, { status: "sold", damageAmount: 15000 });
    expect(updated.status).toBe("sold");
    expect(updated.damageAmount).toBe(15000);
    expect(updated.equipment).toEqual(["Sunroof", "Deri Koltuk", "Geri Görüş Kamerası"]); // korunmuş olmalı

    // Silme: ekspertiz + belgeler + fotoğraflar hepsi Storage'dan silinmeye çalışılmalı.
    await deleteVehicle(context, created.id);
    const all = await listVehicles(context);
    expect(all.find((v) => v.id === created.id)).toBeUndefined();
  });
});
