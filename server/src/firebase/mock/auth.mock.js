// server/src/firebase/mock/auth.mock.js
//
// Firebase Admin Auth'un sahte hâli — firestore.mock.js/storage.mock.js ile
// AYNI amaç: FIREBASE_MODE=mock iken gerçek bir Firebase projesine hiç
// dokunmadan (idToken/session cookie üretimi dahil) uçtan uca test
// edilebilsin. Kapsam SADECE auth.service.js ve user.postgres.service.js'in
// fiilen kullandığı metodlarla sınırlı — Admin SDK'nın geri kalanı taklit
// edilmiyor.
//
// firestore.mock.js'ten FARKLI olarak diske YAZAR (storage.mock.js'teki
// ".mock-r2/" ile aynı felsefe, bkz. server/.gitignore) — bellek içi kalsaydı
// `scripts/bootstrap-owner-mock.js` (AYRI bir Node process) oluşturduğu
// kullanıcıyı asıl `npm run dev` sunucusu (BAŞKA bir process) HİÇ göremezdi.
// Disk, iki process arasındaki TEK paylaşılan durum.
//
// idToken / session cookie burada GERÇEK bir JWT DEĞİL — sadece kendi
// sunucumuzun üretip kendi sunucumuzun hemen doğruladığı, base64url ile
// kodlanmış düz bir JSON (imzasız, isteyen çözüp değiştirebilir). Bu asla
// canlıda seçilmez (bkz. auth.client.js#getAuthClient — sadece
// FIREBASE_MODE=mock iken bu dosyaya düşer) ve idToken'ı üreten TEK yol da
// zaten kendi sunucumuzdaki mock-only `/auth/mock-token` uç noktası (bkz.
// auth.controller.js#createMockTokenController) — dışarıdan keyfi bir
// idToken üretilip buraya sokulamaz.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.resolve(__dirname, "../../../.mock-auth/users.json");

function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return { users: [], nextUidSeq: 1 };
  }
}

const initialStore = loadStore();
const usersByUid = new Map(initialStore.users.map((u) => [u.uid, u]));
const uidByEmail = new Map(initialStore.users.map((u) => [u.email, u.uid]));
let nextUidSeq = initialStore.nextUidSeq ?? 1;

function persist() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify({ users: [...usersByUid.values()], nextUidSeq }, null, 2));
}

function authError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function encodeToken(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeToken(token) {
  try {
    return JSON.parse(Buffer.from(String(token), "base64url").toString("utf8"));
  } catch {
    throw authError("auth/argument-error", "Geçersiz mock token.");
  }
}

/** Gerçek Admin SDK'nın UserRecord'una BENZER ama sadece kullanılan alanlar. */
function toUserRecord(user) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? null,
    disabled: user.disabled ?? false,
    customClaims: user.customClaims ?? {},
  };
}

export const mockAuth = {
  async createUser({ email, password, displayName, emailVerified }) {
    if (uidByEmail.has(email)) throw authError("auth/email-already-exists", "Bu e-posta adresiyle zaten bir hesap var.");
    if (!password || password.length < 6) throw authError("auth/invalid-password", "Şifre en az 6 karakter olmalı.");
    const uid = `mock-${nextUidSeq++}-${crypto.randomBytes(4).toString("hex")}`;
    const user = { uid, email, password, displayName: displayName ?? null, disabled: false, customClaims: {}, emailVerified: Boolean(emailVerified) };
    usersByUid.set(uid, user);
    uidByEmail.set(email, uid);
    persist();
    return toUserRecord(user);
  },

  async getUserByEmail(email) {
    const uid = uidByEmail.get(email);
    if (!uid) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    return toUserRecord(usersByUid.get(uid));
  },

  async getUser(uid) {
    const user = usersByUid.get(uid);
    if (!user) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    return toUserRecord(user);
  },

  async updateUser(uid, updates = {}) {
    const user = usersByUid.get(uid);
    if (!user) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    if (updates.email !== undefined && updates.email !== user.email) {
      if (uidByEmail.has(updates.email)) throw authError("auth/email-already-exists", "Bu e-posta adresiyle zaten bir hesap var.");
      uidByEmail.delete(user.email);
      uidByEmail.set(updates.email, uid);
      user.email = updates.email;
    }
    if (updates.password !== undefined) user.password = updates.password;
    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.disabled !== undefined) user.disabled = updates.disabled;
    persist();
    return toUserRecord(user);
  },

  async deleteUser(uid) {
    const user = usersByUid.get(uid);
    if (!user) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    uidByEmail.delete(user.email);
    usersByUid.delete(uid);
    persist();
  },

  async setCustomUserClaims(uid, claims) {
    const user = usersByUid.get(uid);
    if (!user) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    user.customClaims = claims ?? {};
    persist();
  },

  /**
   * Gerçek Admin SDK'da YOK — sadece bu mock'a özel. Şifreyi burada
   * doğrulayıp (gerçek Firebase client SDK'nın signInWithEmailAndPassword'ü
   * yerine geçen) bir mock idToken üretir. Çağıran: SADECE mock-only
   * `POST /auth/mock-token` (bkz. auth.controller.js).
   */
  async verifyPassword(email, password) {
    const uid = uidByEmail.get(email);
    const user = uid && usersByUid.get(uid);
    if (!user || user.password !== password) throw authError("auth/invalid-credential", "E-posta veya şifre hatalı.");
    if (user.disabled) throw authError("auth/user-disabled", "Bu hesap devre dışı bırakılmış.");
    return encodeToken({ uid: user.uid, ...user.customClaims });
  },

  async verifyIdToken(idToken) {
    const decoded = decodeToken(idToken);
    const user = usersByUid.get(decoded.uid);
    if (!user) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    return { uid: user.uid, tenantId: user.customClaims?.tenantId ?? null, role: user.customClaims?.role ?? null };
  },

  async createSessionCookie(idToken, { expiresIn } = {}) {
    const decoded = decodeToken(idToken);
    const user = usersByUid.get(decoded.uid);
    if (!user) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    return encodeToken({ uid: user.uid, ...user.customClaims, exp: Date.now() + expiresIn });
  },

  async verifySessionCookie(cookie) {
    const decoded = decodeToken(cookie);
    if (decoded.exp && Date.now() > decoded.exp) throw authError("auth/session-cookie-expired", "Oturum süresi doldu.");
    const user = usersByUid.get(decoded.uid);
    if (!user) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
    return { uid: user.uid, tenantId: user.customClaims?.tenantId ?? null, role: user.customClaims?.role ?? null };
  },

  /**
   * Gerçek Admin SDK'da revoke edilen refresh token'lar, o andan ÖNCE
   * üretilmiş idToken'ları geçersiz kılar (client SDK bir sonraki
   * yenilemede reddedilir). Burada gerçek bir "iptal listesi" kurmuyoruz —
   * mock session cookie zaten kendi `exp`'ine göre süreleniyor ve mock
   * modda hiçbir gerçek client SDK token yenilemesi yok — bu yüzden no-op;
   * sadece uid'nin var olduğunu doğruluyor (logout akışının, olmayan bir
   * kullanıcı için sessizce başarılı görünmesini önlemek için).
   */
  async revokeRefreshTokens(uid) {
    if (!usersByUid.has(uid)) throw authError("auth/user-not-found", "Kullanıcı bulunamadı.");
  },
};
