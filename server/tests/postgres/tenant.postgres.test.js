// server/tests/postgres/tenant.postgres.test.js
//
// tenant.service.js'i GERÇEK yerel bir PostgreSQL'e karşı test eder (bkz.
// pgTestDb.js) — AŞAMA (File Store kaldırma): tenants Firestore'dan
// Postgres'e taşındı (bkz. tenant.postgres.repository.js), bu iki describe
// bloğu eskiden tests/tenant.service.automations.test.js ve
// tests/rolePermissions.test.js'in "tenant.service rol/izin yönetimi"
// bloğuydu — buraya, AYNI senaryolarla taşındı.
import { jest } from "@jest/globals";
import { getTestPool, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({
  getPool: async () => getTestPool(),
}));

const { getTenantAutomations, setTenantAutomations, getTenantRolePermissions, setTenantRolePermissions, createTenantForOwner } =
  await import("../../src/services/tenant.service.js");
const { DEFAULT_AUTOMATIONS } = await import("../../src/models/tenant.model.js");
const { BASE_PERMISSIONS } = await import("../../src/config/permissions.js");

/** Her testin kendi tenant'ı — paylaşımlı bir fixture yerine, testler arası izolasyon için (truncateAll yerine, tenants tablosu SCOPED_TABLES'ta değil, bkz. pgTestDb.js). */
async function makeTenant(slugPrefix) {
  return createTenantForOwner({ name: "Test Ofis", slug: `${slugPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`, ownerUserId: "owner1" });
}

afterAll(async () => {
  await closeTestPool();
});

describe("tenant.service (postgres) — getTenantAutomations/setTenantAutomations", () => {
  it("automations alanı hiç yoksa DEFAULT_AUTOMATIONS'ın tamamını döner", async () => {
    const tenant = await makeTenant("ofis-otomasyon-1");
    expect(await getTenantAutomations(tenant.id)).toEqual(DEFAULT_AUTOMATIONS);
  });

  it("automations VAR ama yeni bir alt-otomasyon anahtarı eksikse, sadece o eksik anahtarı DEFAULT'tan tamamlar (mevcutları ezmez)", async () => {
    const tenant = await makeTenant("ofis-otomasyon-2");
    const { windowClosingAlert: _omitted, ...eskiAutomations } = DEFAULT_AUTOMATIONS;
    void _omitted;
    const customizedOffHours = { ...eskiAutomations.offHoursReply, enabled: true };
    await setTenantAutomations(tenant.id, { ...eskiAutomations, offHoursReply: customizedOffHours });

    const result = await getTenantAutomations(tenant.id);
    expect(result.windowClosingAlert).toEqual(DEFAULT_AUTOMATIONS.windowClosingAlert);
    expect(result.offHoursReply.enabled).toBe(true);
  });

  it("setTenantAutomations kısmi bir güncellemeyi (tek alt-otomasyon) diğerlerini bozmadan kaydeder", async () => {
    const tenant = await makeTenant("ofis-otomasyon-3");
    await setTenantAutomations(tenant.id, { listingMatch: { ...DEFAULT_AUTOMATIONS.listingMatch, enabled: true } });

    const result = await getTenantAutomations(tenant.id);
    expect(result.listingMatch.enabled).toBe(true);
    expect(result.appointmentReminder).toEqual(DEFAULT_AUTOMATIONS.appointmentReminder);
    expect(result.windowClosingAlert).toEqual(DEFAULT_AUTOMATIONS.windowClosingAlert);
  });

  it("bir otomasyon türü VAR ama içinde SONRADAN eklenen bir alt alan eksikse (ör. leadResponseAlert.repeatMinutes), o alanı da DEFAULT'tan tamamlar", async () => {
    const tenant = await makeTenant("ofis-otomasyon-4");
    const { repeatMinutes: _omitted, ...eskiLeadResponseAlert } = DEFAULT_AUTOMATIONS.leadResponseAlert;
    void _omitted;
    await setTenantAutomations(tenant.id, { leadResponseAlert: { ...eskiLeadResponseAlert, enabled: true } });

    const result = await getTenantAutomations(tenant.id);
    expect(result.leadResponseAlert.enabled).toBe(true);
    expect(result.leadResponseAlert.repeatMinutes).toBe(DEFAULT_AUTOMATIONS.leadResponseAlert.repeatMinutes);
  });
});

describe("Yetkiler (postgres) — tenant.service rol/izin yönetimi", () => {
  it("override yokken BASE_PERMISSIONS'taki varsayılanı döner", async () => {
    const tenant = await makeTenant("ofis-izin-1");
    const effective = await getTenantRolePermissions(tenant.id);
    expect(effective.assistant.slice().sort()).toEqual(BASE_PERMISSIONS.assistant.slice().sort());
  });

  it("owner/admin rolünün izinleri Yetkiler'den değiştirilemez", async () => {
    const tenant = await makeTenant("ofis-izin-2");
    await expect(setTenantRolePermissions(tenant.id, { owner: ["*"] })).rejects.toThrow();
  });

  it("katalogda olmayan bir izin (örn. tenant:manage) reddedilir", async () => {
    const tenant = await makeTenant("ofis-izin-3");
    await expect(setTenantRolePermissions(tenant.id, { assistant: ["tenant:manage"] })).rejects.toThrow();
  });

  it("geçerli bir kısıtlama kaydedilip doğru okunur", async () => {
    const tenant = await makeTenant("ofis-izin-4");
    await setTenantRolePermissions(tenant.id, { assistant: ["properties:read", "customers:read"] });
    const effective = await getTenantRolePermissions(tenant.id);
    expect(effective.assistant).toEqual(["properties:read", "customers:read"]);
  });
});
