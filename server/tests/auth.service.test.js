// server/tests/auth.service.test.js
//
// user.service.test.js ile aynı desen: Firebase Auth burada da taklit
// ediliyor. Asıl korunan şey: tenant'a bağlı olmayan (tenantId/role custom
// claim'i eksik) bir hesabın oturum açamaması — bu, "hesabınız henüz bir
// ofise bağlanmamış" mesajının GERÇEKTEN uygulandığının kanıtı.
import { jest } from "@jest/globals";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

function makeFakeAuth(overrides = {}) {
  return {
    verifyIdToken: jest.fn(async () => ({ uid: "u1", tenantId: "test-tenant", role: "owner" })),
    createSessionCookie: jest.fn(async () => "fake-session-cookie"),
    verifySessionCookie: jest.fn(async () => ({ uid: "u1", tenantId: "test-tenant", role: "owner" })),
    revokeRefreshTokens: jest.fn(async () => {}),
    ...overrides,
  };
}

let fakeAuth = makeFakeAuth();

jest.unstable_mockModule("../src/firebase/auth.client.js", () => ({
  getAuthClient: async () => fakeAuth,
}));

const { createSession, verifySessionCookie, revokeSessions, getMe } = await import("../src/services/auth.service.js");
const { userRepository } = await import("../src/repositories/user.repository.js");
const { createDefaultUser } = await import("../src/models/user.model.js");
const tenantRepo = await import("../src/repositories/tenant.repository.js");
const { createDefaultTenant } = await import("../src/models/tenant.model.js");

describe("auth.service — createSession", () => {
  beforeEach(() => {
    resetMockFirestore();
    fakeAuth = makeFakeAuth();
  });

  it("tenantId/role claim'i olmayan bir token'la oturum açılamaz", async () => {
    fakeAuth = makeFakeAuth({ verifyIdToken: jest.fn(async () => ({ uid: "u1" })) });
    await expect(createSession("fake-token")).rejects.toThrow(/ofisine bağlanmamış/);
  });

  it("geçerli claim'lerle oturum açılır, cookie döner", async () => {
    const session = await createSession("fake-token");
    expect(session.cookie).toBe("fake-session-cookie");
    expect(session.uid).toBe("u1");
  });

  it('"beni hatırla" işaretliyse daha uzun süreli bir cookie istenir', async () => {
    await createSession("fake-token", { rememberMe: true });
    const [, options] = fakeAuth.createSessionCookie.mock.calls[0];
    const rememberedMs = options.expiresIn;

    await createSession("fake-token", { rememberMe: false });
    const [, options2] = fakeAuth.createSessionCookie.mock.calls[1];
    const defaultMs = options2.expiresIn;

    expect(rememberedMs).toBeGreaterThan(defaultMs);
  });
});

describe("auth.service — verifySessionCookie / revokeSessions", () => {
  beforeEach(() => {
    resetMockFirestore();
    fakeAuth = makeFakeAuth();
  });

  it("geçerli cookie'den tenantId/role çıkarır", async () => {
    const result = await verifySessionCookie("fake-cookie");
    expect(result).toEqual({ uid: "u1", tenantId: "test-tenant", role: "owner" });
  });

  it("revokeSessions doğru uid ile Auth'u çağırır", async () => {
    await revokeSessions("u1");
    expect(fakeAuth.revokeRefreshTokens).toHaveBeenCalledWith("u1");
  });
});

describe("auth.service — getMe", () => {
  beforeEach(() => {
    resetMockFirestore();
    fakeAuth = makeFakeAuth();
  });

  it("kullanıcı Firestore'da yoksa NotFound fırlatır", async () => {
    await expect(getMe({ tenantId: "test-tenant", userId: "olmayan-uid" })).rejects.toThrow(/bulunamadı/);
  });

  it("kullanıcı ve tenant bilgisini birlikte döner", async () => {
    const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: "auth-test-ofis", ownerUserId: "u1" }));
    const ctx = { tenantId: tenant.id, userId: "u1", role: "owner" };
    await userRepository.createWithUid(ctx, "u1", createDefaultUser({ tenantId: tenant.id, email: "u1@test.com", role: "owner" }));

    const result = await getMe(ctx);
    expect(result.user.email).toBe("u1@test.com");
    expect(result.tenant.id).toBe(tenant.id);
  });
});
