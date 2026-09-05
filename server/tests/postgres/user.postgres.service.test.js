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
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { createDefaultTenant } = await import("../../src/models/tenant.model.js");

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

describe("user.postgres.service — bir üyeyi pasife almak BAŞKA HİÇBİR HESABI etkilemez (P1 güvenlik doğrulaması)", () => {
  let memberId;

  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
    await seedOwner();
    const created = await createTeamMember(context, { email: "normal-uye@test.com", password: "uye-sifresi-1", role: "agent" });
    memberId = created.id;
  });
  afterAll(() => closeTestPool());

  it("normal bir üyeyi pasife almak owner'ın MEVCUT oturumunu bozmaz VE owner tekrar giriş yapabilir", async () => {
    // Owner zaten açık bir oturuma sahip (senaryo: admin panelde login'li, o an bir üyeyi pasife alıyor).
    const ownerLogin = await login("owner@test.com", "owner-sifresi");
    await expect(verifySessionToken(ownerLogin.token)).resolves.toEqual(
      expect.objectContaining({ uid: "owner-uid", role: "owner" }),
    );

    await updateTeamMember(context, memberId, { status: "passive" });

    // 1) Owner'ın İŞLEMİ YAPARKEN kullandığı, önceden var olan oturumu hâlâ geçerli.
    await expect(verifySessionToken(ownerLogin.token)).resolves.toEqual(
      expect.objectContaining({ uid: "owner-uid", role: "owner" }),
    );

    // 2) Owner sıfırdan TEKRAR giriş yapabiliyor (bu, raporlanan bug'ın tam olarak iddia ettiği şey — burada BAŞARILI olmalı).
    await expect(login("owner@test.com", "owner-sifresi")).resolves.toEqual(expect.objectContaining({ token: expect.any(String) }));
  });

  it("pasife alınan üye ACCOUNT_INACTIVE koduyla reddedilir (yanlış şifre koduyla KARIŞTIRILMAZ)", async () => {
    await updateTeamMember(context, memberId, { status: "passive" });

    await expect(login("normal-uye@test.com", "uye-sifresi-1")).rejects.toMatchObject({ code: "ACCOUNT_INACTIVE" });
  });

  it("bir üyeyi pasife almak TENANT'IN KENDİ durumunu değiştirmez", async () => {
    const tenant = await tenantRepo.createTenant(
      createDefaultTenant({ name: "Durum Testi Ofisi", slug: `durum-test-${Date.now()}`, ownerUserId: "owner-uid" }),
    );
    expect(tenant.status).toBe("trial");

    await updateTeamMember(context, memberId, { status: "passive" });

    const tenantAfter = await tenantRepo.findTenantById(tenant.id);
    expect(tenantAfter.status).toBe("trial"); // hiç dokunulmadı
  });

  it("bir üyeyi pasife almak AYNI tenant'taki BAŞKA AKTİF üyeleri etkilemez", async () => {
    const otherMember = await createTeamMember(context, { email: "diger-uye@test.com", password: "diger-sifre-1", role: "assistant" });

    await updateTeamMember(context, memberId, { status: "passive" });

    await expect(login("diger-uye@test.com", "diger-sifre-1")).resolves.toEqual(expect.objectContaining({ token: expect.any(String) }));
    const stillActive = await userPostgresRepository.findByUid(context, otherMember.id);
    expect(stillActive.status).toBe("active");
  });

  it("bir tenant'taki üyeyi pasife almak BAŞKA BİR TENANT'IN owner'ını KESİNLİKLE etkilemez (tenant izolasyonu)", async () => {
    const otherTenantContext = { tenantId: "other-tenant", userId: "other-owner-uid", role: "owner" };
    const otherPasswordHash = await hashPassword("diger-tenant-sifresi");
    await userPostgresRepository.createWithUid(otherTenantContext, "other-owner-uid", {
      ...createDefaultUser({ tenantId: "other-tenant", email: "diger-tenant-owner@test.com", role: "owner" }),
      passwordHash: otherPasswordHash,
    });

    await updateTeamMember(context, memberId, { status: "passive" });

    const otherLogin = await login("diger-tenant-owner@test.com", "diger-tenant-sifresi");
    const verified = await verifySessionToken(otherLogin.token);
    expect(verified).toEqual({ uid: "other-owner-uid", tenantId: "other-tenant", role: "owner" });
  });

  it("pasif üyenin ÖNCEDEN AÇIK oturumuyla yapılan sonraki bir istek reddedilir (owner'ınki değil)", async () => {
    const memberLogin = await login("normal-uye@test.com", "uye-sifresi-1");
    const ownerLogin = await login("owner@test.com", "owner-sifresi");

    await updateTeamMember(context, memberId, { status: "passive" });

    await expect(verifySessionToken(memberLogin.token)).rejects.toThrow(/geçersiz/);
    await expect(verifySessionToken(ownerLogin.token)).resolves.toEqual(expect.objectContaining({ uid: "owner-uid" }));
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
