// server/src/services/auth.service.js
import { getAuthClient } from "../firebase/auth.client.js";
import { userRepository } from "../repositories/user.repository.js";
import { getTenantById } from "./tenant.service.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

/**
 * `idToken`: istemcinin Firebase client SDK ile giriş yaptıktan sonra elde
 * ettiği kısa ömürlü token. Bunu doğrulayıp custom claims'i (tenantId, role)
 * kontrol eder, sonra bir httpOnly session cookie üretir.
 *
 * Bu proje TEK bir emlak ofisi için kurulur (bkz. scripts/bootstrap-owner.js)
 * — kendi kendine kayıt akışı yok, tüm kullanıcılar (Danışman/Personel)
 * sadece admin tarafından (bkz. user.service.js) oluşturulur.
 *
 * `rememberMe`: Firebase session cookie'sinin kendi geçerlilik süresini
 * belirler (işaretliyse tavan olan 14 gün, değilse 1 gün) — cookie'nin
 * tarayıcıda KALICI olup olmaması ayrı bir konu, ona auth.controller.js
 * cookie'ye `maxAge` verip vermeyerek karar verir (bkz. persistent alanı).
 */
export async function createSession(idToken, { rememberMe = false } = {}) {
  const auth = await getAuthClient();
  const decoded = await auth.verifyIdToken(idToken);

  if (!decoded.tenantId || !decoded.role) {
    throw ApiError.forbidden("Hesabınız henüz bir emlak ofisine bağlanmamış.");
  }

  const expiryDays = rememberMe ? env.session.rememberExpiryDays : env.session.defaultExpiryDays;
  const expiresInMs = expiryDays * 24 * 60 * 60 * 1000;
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  return { cookie, maxAgeMs: expiresInMs, uid: decoded.uid, persistent: rememberMe };
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

export async function getMe(context) {
  const [user, tenant] = await Promise.all([
    userRepository.findByUid(context, context.userId),
    getTenantById(context.tenantId),
  ]);
  if (!user) throw ApiError.notFound("Kullanıcı kaydı bulunamadı.");
  return { user, tenant };
}
