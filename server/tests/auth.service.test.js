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

// AŞAMA 11 CUTOVER: getMe() artık userPostgresRepository okuyor (bkz.
// auth.service.js) — bu Firestore-mock paketinde test edilemez, Postgres
// karşılığı tests/postgres/auth.postgres.test.js'e taşındı.
const { createSession, verifySessionCookie, revokeSessions } = await import("../src/services/auth.service.js");

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
