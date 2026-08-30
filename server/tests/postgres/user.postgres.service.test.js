// server/tests/postgres/user.postgres.service.test.js — tests/user.service.test.js ile paralel.
// Auth İSTEMCİSİ (getAuthClient) BİLEREK burada da taklit ediliyor — bu
// servis kasıtlı olarak Firebase Auth'a bağlı kalıyor (bkz. user.postgres.service.js'in
// kendi yorumu, Aşama 12'ye kadar böyle kalacak).
//
// "viewer" rolüyle hesap açma testi ÖZELLİKLE önemli: migrations/tenant/
// 1700000000011_fix-users-role-check-constraint.js olmasaydı bu test DB
// CHECK ihlaliyle patlardı — Aşama 2'de fark edilmeyip Aşama 3'te bu
// servisi yazarken yakalanan gerçek bir şema hatasının regresyon testi.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

function makeFakeAuth(overrides = {}) {
  return {
    createUser: jest.fn(async ({ email }) => ({ uid: `uid-${email}` })),
    deleteUser: jest.fn(async () => {}),
    updateUser: jest.fn(async () => {}),
    setCustomUserClaims: jest.fn(async () => {}),
    ...overrides,
  };
}

let fakeAuth = makeFakeAuth();

jest.unstable_mockModule("../../src/firebase/auth.client.js", () => ({
  getAuthClient: async () => fakeAuth,
}));

const { createTeamMember, updateTeamMember, deleteTeamMember } = await import("../../src/services/user.postgres.service.js");
const { userPostgresRepository } = await import("../../src/repositories/user.postgres.repository.js");
const { createDefaultUser } = await import("../../src/models/user.model.js");

const context = { tenantId: "test-tenant", userId: "owner-uid", role: "owner" };

async function seedOwner() {
  await userPostgresRepository.createWithUid(context, "owner-uid", createDefaultUser({ tenantId: "test-tenant", email: "owner@test.com", role: "owner" }));
}

describe("user.postgres.service — rol ataması ve doğrulama", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => {
    truncateAll();
    fakeAuth = makeFakeAuth();
  });
  afterAll(() => closeTestPool());

  it('"owner" rolü bu uçtan atanamaz', async () => {
    await expect(createTeamMember(context, { email: "x@test.com", password: "123456", role: "owner" })).rejects.toThrow(
      /agent.*assistant|Danışman.*Personel/,
    );
  });

  it("geçerli role (assistant) ile hesap oluşturulur", async () => {
    const created = await createTeamMember(context, { email: "personel@test.com", password: "123456", role: "assistant" });
    expect(created.role).toBe("assistant");
    expect(fakeAuth.setCustomUserClaims).toHaveBeenCalledWith(expect.any(String), { tenantId: "test-tenant", role: "assistant" });
  });

  it('"viewer" (Kısıtlı) rolüyle hesap oluşturulabilir — CHECK constraint düzeltmesinin regresyon testi', async () => {
    const created = await createTeamMember(context, { email: "kisitli@test.com", password: "123456", role: "viewer" });
    expect(created.role).toBe("viewer");
  });
});

describe("user.postgres.service — createTeamMember rollback güvenliği", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => {
    truncateAll();
    fakeAuth = makeFakeAuth();
  });
  afterAll(() => closeTestPool());

  it("DB yazımı BAŞARISIZ olursa az önce açılan Auth hesabı GERİ ALINIR", async () => {
    jest.spyOn(userPostgresRepository, "createWithUid").mockRejectedValueOnce(new Error("DB yazım hatası (simüle)"));

    await expect(createTeamMember(context, { email: "hayalet@test.com", password: "123456", role: "agent" })).rejects.toThrow(
      /simüle/,
    );

    expect(fakeAuth.deleteUser).toHaveBeenCalledWith("uid-hayalet@test.com");
    userPostgresRepository.createWithUid.mockRestore();
  });
});

describe("user.postgres.service — owner hesabı korunuyor", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    fakeAuth = makeFakeAuth();
    await seedOwner();
  });
  afterAll(() => closeTestPool());

  it("owner hesabı updateTeamMember ile değiştirilemez", async () => {
    await expect(updateTeamMember(context, "owner-uid", { displayName: "Hacklendi" })).rejects.toThrow(/[Oo]wner/);
  });

  it("owner hesabı deleteTeamMember ile silinemez", async () => {
    await expect(deleteTeamMember(context, "owner-uid")).rejects.toThrow(/[Oo]wner/);
    expect(fakeAuth.deleteUser).not.toHaveBeenCalled();
  });

  it("olmayan bir kullanıcıyı güncellemeye çalışınca NotFound fırlatır", async () => {
    await expect(updateTeamMember(context, "olmayan-uid", { displayName: "x" })).rejects.toThrow(/bulunamadı/);
  });
});

describe("user.postgres.service — updateTeamMember doğrulama", () => {
  let memberId;

  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    fakeAuth = makeFakeAuth();
    await seedOwner();
    const created = await createTeamMember(context, { email: "personel@test.com", password: "123456", role: "assistant" });
    memberId = created.id;
  });
  afterAll(() => closeTestPool());

  it('status "active"/"passive" dışında bir değer reddedilir', async () => {
    await expect(updateTeamMember(context, memberId, { status: "banned" })).rejects.toThrow(/active.*passive/);
  });

  it('status "passive" yapılınca Auth hesabı da disable edilir', async () => {
    await updateTeamMember(context, memberId, { status: "passive" });
    expect(fakeAuth.updateUser).toHaveBeenCalledWith(memberId, expect.objectContaining({ disabled: true }));
  });

  it("6 karakterden kısa yeni şifre reddedilir", async () => {
    await expect(updateTeamMember(context, memberId, { password: "123" })).rejects.toThrow(/6 karakter/);
  });
});
