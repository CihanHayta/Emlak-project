// server/tests/user.service.test.js
//
// user.service.js Firebase Auth'a bağımlı (mock modda gerçek Auth yok, bkz.
// firebase/auth.client.js) — bu yüzden `getAuthClient`'ı burada elle taklit
// ediyoruz (jest.unstable_mockModule, native ESM'de jest.mock'un karşılığı).
// Asıl korumak istediğimiz şey rollback/owner-koruma mantığı: Auth hesabı
// açılıp Firestore yazımı başarısız olursa Auth hesabının GERİ ALINMASI,
// ve "owner" rolündeki hesabın bu uçlardan asla değiştirilememesi.
import { jest } from "@jest/globals";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

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

jest.unstable_mockModule("../src/firebase/auth.client.js", () => ({
  getAuthClient: async () => fakeAuth,
}));

const { createTeamMember, updateTeamMember, deleteTeamMember } = await import("../src/services/user.service.js");
const { userRepository } = await import("../src/repositories/user.repository.js");
const { createDefaultUser } = await import("../src/models/user.model.js");

const context = { tenantId: "test-tenant", userId: "owner-uid", role: "owner" };

async function seedOwner() {
  await userRepository.createWithUid(context, "owner-uid", createDefaultUser({ tenantId: "test-tenant", email: "owner@test.com", role: "owner" }));
}

describe("user.service — rol ataması ve doğrulama", () => {
  beforeEach(() => {
    resetMockFirestore();
    fakeAuth = makeFakeAuth();
  });

  it('"owner" rolü bu uçtan atanamaz', async () => {
    await expect(createTeamMember(context, { email: "x@test.com", password: "123456", role: "owner" })).rejects.toThrow(
      /agent.*assistant|Danışman.*Personel/,
    );
  });

  it("geçersiz bir rol reddedilir", async () => {
    await expect(createTeamMember(context, { email: "x@test.com", password: "123456", role: "yönetici" })).rejects.toThrow();
  });

  it("geçerli role (assistant) ile hesap oluşturulur", async () => {
    const created = await createTeamMember(context, { email: "personel@test.com", password: "123456", role: "assistant" });
    expect(created.role).toBe("assistant");
    expect(fakeAuth.setCustomUserClaims).toHaveBeenCalledWith(expect.any(String), { tenantId: "test-tenant", role: "assistant" });
  });
});

describe("user.service — createTeamMember rollback güvenliği", () => {
  beforeEach(() => {
    resetMockFirestore();
    fakeAuth = makeFakeAuth();
  });

  it("Firestore yazımı BAŞARISIZ olursa az önce açılan Auth hesabı GERİ ALINIR", async () => {
    // userRepository.createWithUid'i bozarak Firestore yazımını simüle-hatalı yap.
    const originalCreateWithUid = userRepository.createWithUid.bind(userRepository);
    jest.spyOn(userRepository, "createWithUid").mockRejectedValueOnce(new Error("Firestore yazım hatası (simüle)"));

    await expect(createTeamMember(context, { email: "hayalet@test.com", password: "123456", role: "agent" })).rejects.toThrow(
      /simüle/,
    );

    expect(fakeAuth.deleteUser).toHaveBeenCalledWith("uid-hayalet@test.com");
    userRepository.createWithUid.mockRestore();
    void originalCreateWithUid;
  });

  it("Auth hesabı zaten var olan bir e-postayla açılamaz", async () => {
    fakeAuth = makeFakeAuth({
      createUser: jest.fn(async () => {
        const err = new Error("exists");
        err.code = "auth/email-already-exists";
        throw err;
      }),
    });
    await expect(createTeamMember(context, { email: "var@test.com", password: "123456", role: "agent" })).rejects.toThrow(
      /zaten bir hesap/,
    );
  });
});

describe("user.service — owner hesabı korunuyor", () => {
  beforeEach(async () => {
    resetMockFirestore();
    fakeAuth = makeFakeAuth();
    await seedOwner();
  });

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

describe("user.service — updateTeamMember doğrulama", () => {
  let memberId;

  beforeEach(async () => {
    resetMockFirestore();
    fakeAuth = makeFakeAuth();
    await seedOwner();
    const created = await createTeamMember(context, { email: "personel@test.com", password: "123456", role: "assistant" });
    memberId = created.id;
  });

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
