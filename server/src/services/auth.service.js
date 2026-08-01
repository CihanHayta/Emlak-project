// server/src/services/auth.service.js
import { getAuthClient } from "../firebase/auth.client.js";
import { userRepository } from "../repositories/user.repository.js";
import { getTenantById, createTenantForOwner } from "./tenant.service.js";
import { createDefaultUser } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

/**
 * `idToken`: istemcinin Firebase client SDK ile giriş yaptıktan sonra elde
 * ettiği kısa ömürlü token. Bunu doğrulayıp custom claims'i (tenantId, role)
 * kontrol eder, sonra uzun ömürlü bir httpOnly session cookie üretir.
 *
 * ÖNEMLİ (bilinen kısıt): `setCustomUserClaims` bir kullanıcıya SONRADAN
 * uygulanırsa, o kullanıcının ELİNDEKİ idToken'da bu claims YOKTUR — istemci
 * `getIdToken(true)` ile tokenı zorla yenilemeden bu uç noktayı çağırırsa
 * "Hesabınız henüz bir ofise bağlanmamış" hatası alır. register-tenant akışı
 * (henüz HTTP endpoint olarak açılmadı, bkz. scripts/bootstrap-owner.js)
 * claims'i set ettikten SONRA istemciye idToken'ı yenilemesini söylemelidir.
 */
export async function createSession(idToken) {
  const auth = await getAuthClient();
  const decoded = await auth.verifyIdToken(idToken);

  if (!decoded.tenantId || !decoded.role) {
    throw ApiError.forbidden("Hesabınız henüz bir emlak ofisine bağlanmamış.");
  }

  const expiresInMs = env.session.expiryDays * 24 * 60 * 60 * 1000;
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  return { cookie, maxAgeMs: expiresInMs, uid: decoded.uid };
}

export async function verifySessionCookie(cookie) {
  const auth = await getAuthClient();
  const decoded = await auth.verifySessionCookie(cookie, true /* checkRevoked */);
  return { uid: decoded.uid, tenantId: decoded.tenantId ?? null, role: decoded.role ?? null };
}

export async function revokeSessions(uid) {
  const auth = await getAuthClient();
  await auth.revokeRefreshTokens(uid);
}

/**
 * Yeni bir emlak ofisinin kendi kendine kaydı. İstemci önce Firebase client
 * SDK ile (createUserWithEmailAndPassword) kendi hesabını oluşturur, aldığı
 * `idToken`'ı buraya gönderir. Bu uç nokta tenant'ı + `users/{uid}`
 * dokümanını yaratır ve bu uid'i o tenant'ın "owner"ı yapan custom claims'i
 * set eder. Aynı hesap ikinci kez çağırırsa (zaten bir tenantId'si varsa)
 * reddedilir — bir kullanıcı birden fazla ofis kuramaz (bu ürün kararı,
 * gerekirse ileride gevşetilebilir).
 *
 * ÖNEMLİ: claims sonradan set edildiği için istemcinin elindeki idToken
 * bunu içermez — istemci bu çağrıdan sonra `getIdToken(true)` ile tokenı
 * zorla yenilemeden `POST /auth/session`'ı çağırırsa "ofise bağlı değil"
 * hatası alır (bkz. createSession).
 */
export async function registerTenant({ idToken, companyName, phone }) {
  const auth = await getAuthClient();
  const decoded = await auth.verifyIdToken(idToken);

  if (decoded.tenantId) {
    throw ApiError.conflict("Bu hesap zaten bir emlak ofisine bağlı.");
  }

  const tenant = await createTenantForOwner({ name: companyName, ownerUserId: decoded.uid, phone });

  const context = { tenantId: tenant.id, userId: decoded.uid, role: "owner" };
  const userData = createDefaultUser({
    tenantId: tenant.id,
    email: decoded.email ?? null,
    displayName: decoded.name ?? null,
    role: "owner",
  });
  await userRepository.createWithUid(context, decoded.uid, userData);

  await auth.setCustomUserClaims(decoded.uid, { tenantId: tenant.id, role: "owner" });

  return { tenantId: tenant.id, tenantName: tenant.name, role: "owner" };
}

export async function getMe(context) {
  const [user, tenant] = await Promise.all([
    userRepository.findByUid(context, context.userId),
    getTenantById(context.tenantId),
  ]);
  if (!user) throw ApiError.notFound("Kullanıcı kaydı bulunamadı.");
  return { user, tenant };
}
