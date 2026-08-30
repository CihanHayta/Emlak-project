// server/tests/postgres/user.postgres.service.test.js
//
// AŞAMA (Firebase Auth kaldırma): bu servis artık HİÇBİR Firebase Auth
// istemcisine bağlı değil — şifre hash'i (bcryptjs) doğrudan aynı Postgres
// INSERT/UPDATE'iyle yazılıyor, bu yüzden eski `jest.unstable_mockModule
// ("../../src/firebase/auth.client.js", ...)` sahtesi tamamen kalktı.
//
// Eski "createWithUid BAŞARISIZ olursa Auth hesabı geri alınır" testi
// (iki-sistemli rollback) artık ANLAMSIZ — tek bir atomik SQL ifadesi zaten
// ya tamamen olur ya hiç olmaz, ayrı bir telafi mekanizması yok. Yerine,
// gerçek DB kısıtının (UNIQUE email) doğru bir Conflict hatasına çevrildiğini
// ve BAŞARISIZ bir denemenin arkada YARIM bir satır bırakmadığını test eden
// bir senaryo geldi.
//
// "viewer" rolüyle hesap açma testi ÖZELLİKLE önemli: migrations/
// 1700000000011_fix-users-role-check-constraint.js olmasaydı bu test DB
// CHECK ihlaliyle patlardı — Aşama 2'de fark edilmeyip Aşama 3'te bu
// servisi yazarken yakalanan gerçek bir şema hatasının regresyon testi.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createTeamMember, updateTeamMember, deleteTeamMember } = await import("../../src/services/user.postgres.service.js");
const { login, verifySessionToken } = await import("../../src/services/auth.service.js");
const { userPostgresRepository } = await import("../../src/repositories/user.postgres.repository.js");
const { createDefaultUser } = await import("../../src/models/user.model.js");
const { hashPassword } = await import("../../src/utils/password.util.js");

const context = { tenantId: "test-tenant", userId: "owner-uid", role: "owner" };

async function seedOwner() {
  const passwordHash = await hashPassword("owner-sifresi");
  await userPostgresRepository.createWithUid(context, "owner-uid", {
    ...createDefaultUser({ tenantId: "test-tenant", email: "owner@test.com", role: "owner" }),
    passwordHash,
  });
}

describe("user.postgres.service — rol ataması ve doğrulama", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it('"owner" rolü bu uçtan atanamaz', async () => {
    await expect(createTeamMember(context, { email: "x@test.com", password: "123456", role: "owner" })).rejects.toThrow(
      /agent.*assistant|Danışman.*Personel/,
    );
  });

  it("geçerli role (assistant) ile hesap oluşturulur, şifre hash'i döndürülen satırda YER ALMAZ", async () => {
    const created = await createTeamMember(context, { email: "personel@test.com", password: "123456", role: "assistant" });
    expect(created.role).toBe("assistant");
    expect(created.passwordHash).toBeUndefined();
  });

  it("oluşturulan hesapla gerçekten giriş yapılabilir (bcrypt round-trip)", async () => {
    await createTeamMember(context, { email: "girisyapabilir@test.com", password: "gercek-sifre-1", role: "agent" });
    const { token } = await login("girisyapabilir@test.com", "gercek-sifre-1");
    const verified = await verifySessionToken(token);
    expect(verified.role).toBe("agent");
  });

  it('"viewer" (Kısıtlı) rolüyle hesap oluşturulabilir — CHECK constraint düzeltmesinin regresyon testi', async () => {
    const created = await createTeamMember(context, { email: "kisitli@test.com", password: "123456", role: "viewer" });
    expect(created.role).toBe("viewer");
  });

  it("6 karakterden kısa şifreyle hesap oluşturulamaz", async () => {
    await expect(createTeamMember(context, { email: "kisasifre@test.com", password: "123", role: "agent" })).rejects.toThrow(/6 karakter/);
  });
});

describe("user.postgres.service — e-posta benzersizliği (UNIQUE constraint)", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it("aynı e-postayla ikinci bir hesap oluşturulamaz, okunabilir bir Conflict hatası döner", async () => {
    await createTeamMember(context, { email: "tekrar@test.com", password: "123456", role: "agent" });
    await expect(createTeamMember(context, { email: "tekrar@test.com", password: "başkabirşifre", role: "assistant" })).rejects.toThrow(
      /zaten bir hesap var/,
    );

    // Başarısız deneme arkada yarım bir satır BIRAKMADI — hâlâ tek satır var.
    const all = await userPostgresRepository.findAll(context);
    expect(all.filter((u) => u.email === "tekrar@test.com")).toHaveLength(1);
  });
});

describe("user.postgres.service — owner hesabı korunuyor", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    await seedOwner();
  });
  afterAll(() => closeTestPool());

  it("owner hesabı updateTeamMember ile değiştirilemez", async () => {
    await expect(updateTeamMember(context, "owner-uid", { displayName: "Hacklendi" })).rejects.toThrow(/[Oo]wner/);
  });

  it("owner hesabı deleteTeamMember ile silinemez, satır DB'de olduğu gibi kalır", async () => {
    await expect(deleteTeamMember(context, "owner-uid")).rejects.toThrow(/[Oo]wner/);
    const stillThere = await userPostgresRepository.findByUid(context, "owner-uid");
    expect(stillThere).not.toBeNull();
  });

  it("olmayan bir kullanıcıyı güncellemeye çalışınca NotFound fırlatır", async () => {
    await expect(updateTeamMember(context, "olmayan-uid", { displayName: "x" })).rejects.toThrow(/bulunamadı/);
  });
});

describe("user.postgres.service — updateTeamMember doğrulama ve oturum iptali", () => {
  let memberId;

  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    await seedOwner();
    const created = await createTeamMember(context, { email: "personel@test.com", password: "ilk-sifre-123", role: "assistant" });
    memberId = created.id;
  });
  afterAll(() => closeTestPool());

  it('status "active"/"passive" dışında bir değer reddedilir', async () => {
    await expect(updateTeamMember(context, memberId, { status: "banned" })).rejects.toThrow(/active.*passive/);
  });

  it('status "passive" yapılınca hesabın AÇIK OTURUMLARI da hemen geçersiz kılınır', async () => {
    const { token } = await login("personel@test.com", "ilk-sifre-123");
    await expect(verifySessionToken(token)).resolves.toEqual(expect.objectContaining({ uid: memberId }));

    await updateTeamMember(context, memberId, { status: "passive" });

    await expect(verifySessionToken(token)).rejects.toThrow(/geçersiz/);
  });

  it("6 karakterden kısa yeni şifre reddedilir", async () => {
    await expect(updateTeamMember(context, memberId, { password: "123" })).rejects.toThrow(/6 karakter/);
  });

  it("şifre değiştirilince YENİ şifreyle giriş yapılabilir, ESKİ şifre artık geçersizdir", async () => {
    await updateTeamMember(context, memberId, { password: "yeni-sifre-456" });

    await expect(login("personel@test.com", "ilk-sifre-123")).rejects.toThrow(/hatalı/);
    await expect(login("personel@test.com", "yeni-sifre-456")).resolves.toEqual(expect.objectContaining({ token: expect.any(String) }));
  });
});

describe("user.postgres.service — deleteTeamMember oturumları da temizler", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    await seedOwner();
  });
  afterAll(() => closeTestPool());

  it("silinen kullanıcının açık oturumu artık geçerli değildir", async () => {
    const created = await createTeamMember(context, { email: "silinecek@test.com", password: "sifre-123456", role: "agent" });
    const { token } = await login("silinecek@test.com", "sifre-123456");

    await deleteTeamMember(context, created.id);

    await expect(verifySessionToken(token)).rejects.toThrow(/geçersiz/);
  });
});
