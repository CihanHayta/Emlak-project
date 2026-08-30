// server/tests/rolePermissions.test.js
//
// 2026-08-07'de eklenen "Ayarlar > Yetkiler" özelliğini kalıcı bir
// regresyon testine çeviriyor — o güne kadar bu sekme sadece localStorage'a
// yazan kozmetik bir referans tablosuydu (bkz. feedback_flag_cosmetic_features
// hafıza kaydı), backend'de hiçbir karşılığı yoktu. Bu testler ELLE
// doğrulanmış (node -e script'leriyle) mantığın kalıcı hali — bir sonraki
// kod değişikliği bunu sessizce kırarsa burada patlar.
//
// AŞAMA (File Store kaldırma): "tenant.service rol/izin yönetimi" describe
// bloğu tenant.service.js artık Postgres'e bağlı olduğu için
// tests/postgres/tenant.postgres.test.js'e taşındı — burada sadece
// authorize middleware'in SAF (DB'siz) mantığı kalıyor.
import { authorize } from "../src/middleware/authorize.middleware.js";

function runAuthorize(requiredPermission, role, rolePermissions) {
  let result = null;
  authorize(requiredPermission)({ context: { role, rolePermissions }, user: {} }, {}, (err) => {
    result = err ?? "OK";
  });
  return result;
}

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
