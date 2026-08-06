// server/tests/rolePermissions.test.js
//
// 2026-08-07'de eklenen "Ayarlar > Yetkiler" özelliğini kalıcı bir
// regresyon testine çeviriyor — o güne kadar bu sekme sadece localStorage'a
// yazan kozmetik bir referans tablosuydu (bkz. feedback_flag_cosmetic_features
// hafıza kaydı), backend'de hiçbir karşılığı yoktu. Bu testler ELLE
// doğrulanmış (node -e script'leriyle) mantığın kalıcı hali — bir sonraki
// kod değişikliği bunu sessizce kırarsa burada patlar.
import { createDefaultTenant } from "../src/models/tenant.model.js";
import { createTenant } from "../src/repositories/tenant.repository.js";
import { getTenantRolePermissions, setTenantRolePermissions } from "../src/services/tenant.service.js";
import { authorize } from "../src/middleware/authorize.middleware.js";
import { BASE_PERMISSIONS } from "../src/config/permissions.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

async function makeTenant(slug) {
  return createTenant(createDefaultTenant({ name: "Test Ofis", slug, ownerUserId: "u1" }));
}

function runAuthorize(requiredPermission, role, rolePermissions) {
  let result = null;
  authorize(requiredPermission)({ context: { role, rolePermissions }, user: {} }, {}, (err) => {
    result = err ?? "OK";
  });
  return result;
}

describe("Yetkiler — tenant.service rol/izin yönetimi", () => {
  beforeEach(() => resetMockFirestore());

  it("override yokken BASE_PERMISSIONS'taki varsayılanı döner", async () => {
    const tenant = await makeTenant("test-ofis-1");
    const effective = await getTenantRolePermissions(tenant.id);
    expect(effective.assistant.sort()).toEqual(BASE_PERMISSIONS.assistant.slice().sort());
  });

  it("owner/admin rolünün izinleri Yetkiler'den değiştirilemez", async () => {
    const tenant = await makeTenant("test-ofis-2");
    await expect(setTenantRolePermissions(tenant.id, { owner: ["*"] })).rejects.toThrow();
  });

  it("katalogda olmayan bir izin (örn. tenant:manage) reddedilir", async () => {
    const tenant = await makeTenant("test-ofis-3");
    await expect(setTenantRolePermissions(tenant.id, { assistant: ["tenant:manage"] })).rejects.toThrow();
  });

  it("geçerli bir kısıtlama kaydedilip doğru okunur", async () => {
    const tenant = await makeTenant("test-ofis-4");
    await setTenantRolePermissions(tenant.id, { assistant: ["properties:read", "customers:read"] });
    const effective = await getTenantRolePermissions(tenant.id);
    expect(effective.assistant).toEqual(["properties:read", "customers:read"]);
  });
});

describe("Yetkiler — authorize middleware'in override'ı gerçekten uygulaması", () => {
  it("kısıtlanan role artık izin verilmeyen işlemi yapamaz", () => {
    const override = { assistant: ["properties:read", "customers:read"] };
    const result = runAuthorize("customers:write", "assistant", override);
    expect(result).not.toBe("OK");
    expect(result.status).toBe(403);
  });

  it("kısıtlanan rol hâlâ izin verilen işlemi yapabilir", () => {
    const override = { assistant: ["properties:read", "customers:read"] };
    expect(runAuthorize("customers:read", "assistant", override)).toBe("OK");
  });

  it("override olsa bile owner her zaman tam yetkilidir (kilitlenme koruması)", () => {
    expect(runAuthorize("customers:write", "owner", { owner: [] })).toBe("OK");
  });

  it("override yokken (null) eski BASE_PERMISSIONS davranışı korunur", () => {
    expect(runAuthorize("leads:write", "agent", null)).toBe("OK");
  });
});
