// server/tests/postgres/auth.postgres.test.js
//
// AŞAMA (Firebase Auth kaldırma): auth.service.js'in TAMAMI (login/
// verifySessionToken/logout/getMe) artık Postgres-native — hiçbir Firebase
// Auth istemcisine (mock ya da gerçek) bağımlılık kalmadı, bu yüzden burada
// `jest.unstable_mockModule("../../src/firebase/...")` YOK. `login`/
// `verifySessionToken`/`logout` eskiden (Firebase Auth döneminde) hiçbir
// testte kapsanmıyordu — bu dosya artık onları da kapsıyor.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({
  getPool: async () => getTestPool(),
}));

const { getMe, login, verifySessionToken, logout } = await import("../../src/services/auth.service.js");
const { userPostgresRepository } = await import("../../src/repositories/user.postgres.repository.js");
const { createDefaultUser } = await import("../../src/models/user.model.js");
const { hashPassword } = await import("../../src/utils/password.util.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { createDefaultTenant } = await import("../../src/models/tenant.model.js");

async function seedTenantAndUser({ email = "u1@test.com", password = "sifre123", role = "owner" } = {}) {
  const tenant = await tenantRepo.createTenant(
    createDefaultTenant({ name: "Test Ofis", slug: `auth-test-ofis-${Date.now()}-${Math.random().toString(36).slice(2)}`, ownerUserId: "seed" }),
  );
  const ctx = { tenantId: tenant.id, userId: "seed", role: "owner" };
  const passwordHash = await hashPassword(password);
  const user = await userPostgresRepository.create(ctx, { ...createDefaultUser({ tenantId: tenant.id, email, role }), passwordHash });
  return { tenant, user };
}

describe("auth.service (postgres) — getMe", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it("kullanıcı Postgres'te yoksa NotFound fırlatır", async () => {
    await expect(getMe({ tenantId: "test-tenant", userId: "olmayan-id" })).rejects.toThrow(/bulunamadı/);
  });

  it("kullanıcı ve tenant bilgisini birlikte döner", async () => {
    const { tenant, user } = await seedTenantAndUser();
    const result = await getMe({ tenantId: tenant.id, userId: user.id, role: "owner" });
    expect(result.user.email).toBe("u1@test.com");
    expect(result.tenant.id).toBe(tenant.id);
  });
});

describe("auth.service (postgres) — login / verifySessionToken / logout", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it("doğru e-posta+şifre ile giriş yapılır ve dönen token doğrulanabilir", async () => {
    const { tenant, user } = await seedTenantAndUser({ email: "dogru@test.com", password: "sifre123" });

    const { token } = await login("dogru@test.com", "sifre123");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(32);

    const verified = await verifySessionToken(token);
    expect(verified).toEqual({ uid: user.id, tenantId: tenant.id, role: "owner" });
  });

  it("e-posta büyük/küçük harfe duyarsız eşleşir (normalizeEmail)", async () => {
    await seedTenantAndUser({ email: "kucuk@test.com", password: "sifre123" });
    await expect(login("KUCUK@Test.com", "sifre123")).resolves.toEqual(expect.objectContaining({ token: expect.any(String) }));
  });

  it("yanlış şifreyle giriş reddedilir", async () => {
    await seedTenantAndUser({ email: "yanlissifre@test.com", password: "dogrusifre" });
    await expect(login("yanlissifre@test.com", "baskabirsifre")).rejects.toThrow(/hatalı/);
  });

  it("olmayan e-postayla giriş reddedilir — YANLIŞ ŞİFREYLE AYNI mesajı verir (kullanıcı var/yok bilgisi sızdırılmaz)", async () => {
    await expect(login("hicolmayan@test.com", "herhangibirsifre")).rejects.toThrow(/hatalı/);
  });

  it('status="passive" hesapla giriş reddedilir', async () => {
    const { tenant, user } = await seedTenantAndUser({ email: "pasif@test.com", password: "sifre123" });
    await userPostgresRepository.update({ tenantId: tenant.id }, user.id, { status: "passive" });
    await expect(login("pasif@test.com", "sifre123")).rejects.toThrow(/devre dışı/);
  });

  it("geçersiz/olmayan bir token doğrulanamaz", async () => {
    await expect(verifySessionToken("hic-var-olmamis-bir-token")).rejects.toThrow(/geçersiz/);
  });

  it("logout sonrası aynı token bir daha geçerli değildir", async () => {
    await seedTenantAndUser({ email: "logout@test.com", password: "sifre123" });
    const { token } = await login("logout@test.com", "sifre123");
    await logout(token);
    await expect(verifySessionToken(token)).rejects.toThrow(/geçersiz/);
  });

  it("rememberMe=false kısa, rememberMe=true daha uzun süreli bir oturum üretir", async () => {
    await seedTenantAndUser({ email: "sure@test.com", password: "sifre123" });
    const short = await login("sure@test.com", "sifre123", { rememberMe: false });
    const long = await login("sure@test.com", "sifre123", { rememberMe: true });
    expect(long.maxAgeMs).toBeGreaterThan(short.maxAgeMs);
  });
});
