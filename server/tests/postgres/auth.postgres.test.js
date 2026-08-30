// server/tests/postgres/auth.postgres.test.js
//
// auth.service.js#getMe'nin GERÇEK Postgres'e karşı testi — AŞAMA 11
// CUTOVER: getMe artık userPostgresRepository okuyor (bkz. auth.service.js),
// bu senaryo eskiden tests/auth.service.test.js'in "getMe" describe
// bloğundaydı, oradan buraya taşındı. AŞAMA (File Store kaldırma): tenant
// fixture'ı da artık Postgres (tenant.postgres.repository.js) — tenants
// domain'i Firestore'dan taşındı.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({
  getPool: async () => getTestPool(),
}));

const { getMe } = await import("../../src/services/auth.service.js");
const { userPostgresRepository } = await import("../../src/repositories/user.postgres.repository.js");
const { createDefaultUser } = await import("../../src/models/user.model.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { createDefaultTenant } = await import("../../src/models/tenant.model.js");

describe("auth.service (postgres) — getMe", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it("kullanıcı Postgres'te yoksa NotFound fırlatır", async () => {
    await expect(getMe({ tenantId: "test-tenant", userId: "olmayan-uid" })).rejects.toThrow(/bulunamadı/);
  });

  it("kullanıcı ve tenant bilgisini birlikte döner", async () => {
    const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `auth-test-ofis-${Date.now()}`, ownerUserId: "u1" }));
    const ctx = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await userPostgresRepository.createWithUid(ctx, "u1", createDefaultUser({ tenantId: tenant.id, email: "u1@test.com", role: "owner" }));

    const result = await getMe(ctx);
    expect(result.user.email).toBe("u1@test.com");
    expect(result.tenant.id).toBe(tenant.id);
  });
});
