// server/tests/vehicle.service.test.js
import { jest } from "@jest/globals";
import { createVehicle, getVehicle, updateVehicle, deleteVehicle, listVehicles } from "../src/services/vehicle.service.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { mockStorage } from "../src/firebase/mock/storage.mock.js";

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

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
});
