// server/src/services/auth.service.js
//
// AŞAMA (Firebase Auth kaldırma): Firebase Authentication'ın YERİNE geçen
// Postgres-native kimlik doğrulama — şifre `bcryptjs` ile hash'lenip
// `users.password_hash`'te, oturumlar `sessions` tablosunda tutulur (bkz.
// migrations/1700000000014, 1700000000015). Çağıran katmanların (auth.
// controller.js, auth.middleware.js) gördüğü sözleşme BİLEREK aynı kaldı —
// `req.user = {uid, tenantId, role}` şekli değişmedi, bu yüzden
// customer/property/vb. hiçbir controller'a dokunulmadı.
//
// Firebase'in idToken/session-cookie ikilisi tek bir kavrama indirgendi:
// `login()` doğrudan bir oturum token'ı üretir (artık ayrı bir "idToken"
// adımı yok — o adım zaten sadece Firebase'in kendi iç mimarisinin bir
// gereğiydi, bu uygulamaya özgü bir ihtiyaç değildi).
import { userPostgresRepository } from "../repositories/user.postgres.repository.js";
import { sessionRepository } from "../repositories/session.postgres.repository.js";
import { getTenantById } from "./tenant.service.js";
import { verifyPassword } from "../utils/password.util.js";
import { generateSessionToken, hashSessionToken } from "../utils/session.util.js";
import { normalizeEmail } from "../utils/email.util.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

/**
 * E-posta + şifreyi doğrular, yeni bir sunucu-taraflı oturum açar. Dönen
 * `token` HAM token'dır — çağıran (auth.controller.js) bunu çereze aynen
 * yazar; DB'de sadece hash'i durur (bkz. session.util.js).
 *
 * `rememberMe`: false ise `env.session.defaultExpiryDays` (varsayılan 1
 * gün), true ise `env.session.rememberExpiryDays` (varsayılan 14 gün) —
 * bu iki değişken Firebase döneminden kalma ama artık Firebase'in
 * dayattığı bir tavan değil, tamamen bizim seçtiğimiz bir süre.
 */
export async function login(email, password, { rememberMe = false } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userPostgresRepository.findByEmailWithPasswordHash(normalizedEmail);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthenticated("E-posta veya şifre hatalı.");
  }
  // BİLEREK şifre doğrulamasından SONRA kontrol ediliyor — sırası önemli:
  // yanlış şifre + pasif hesap kombinasyonunda "şifre yanlış" (hesap
  // varlığını sızdırmaz) alınmalı, "hesap pasif" değil. Şifre doğruysa
  // (kişi gerçekten bu hesabın sahibiyse) artık pasif olduğunu bilmesinde
  // sakınca yok — ayrı bir hata kodu (ACCOUNT_INACTIVE) burada BİLEREK
  // kullanılıyor, "e-posta/şifre hatalı" ile karıştırılmasın diye (bkz.
  // constants.js#ERROR_CODES).
  if (user.status === "passive") {
    throw ApiError.accountInactive();
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiryDays = rememberMe ? env.session.rememberExpiryDays : env.session.defaultExpiryDays;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await sessionRepository.create({ userId: user.id, tenantId: user.tenantId, tokenHash, expiresAt });

  return { token, maxAgeMs: expiryDays * 24 * 60 * 60 * 1000, uid: user.id, persistent: rememberMe };
}

/**
 * `authMiddleware`'in tek girişi. Session tablosundan sonra HER SEFERİNDE
 * `users` tablosundan CANLI satırı çeker (role/status/tenant) — Firebase
 * custom claims'in aksine, bir rol değişikliği ya da hesabı pasife alma artık
 * o an açık olan oturumlarda bile ANINDA etkili olur (idToken/claim'in
 * bayatlamasını beklemeye gerek yok, bu eski sistemden daha güvenli).
 */
export async function verifySessionToken(token) {
  if (!token) throw ApiError.unauthenticated();
  const tokenHash = hashSessionToken(token);
  const session = await sessionRepository.findValidByTokenHash(tokenHash);
  if (!session) throw ApiError.unauthenticated("Oturum geçersiz veya süresi dolmuş.");

  const user = await userPostgresRepository.findByIdUnscoped(session.userId);
  if (!user || user.status === "passive") throw ApiError.unauthenticated("Oturum geçersiz veya süresi dolmuş.");

  return { uid: user.id, tenantId: user.tenantId, role: user.role };
}

/** Logout: SADECE mevcut tarayıcının oturumunu iptal eder (diğer cihazlar etkilenmez, bkz. session.postgres.repository.js). */
export async function logout(token) {
  if (!token) return;
  await sessionRepository.revokeByTokenHash(hashSessionToken(token));
}

export async function getMe(context) {
  const [user, tenant] = await Promise.all([
    userPostgresRepository.findByUid(context, context.userId),
    getTenantById(context.tenantId),
  ]);
  if (!user) throw ApiError.notFound("Kullanıcı kaydı bulunamadı.");
  return { user, tenant };
}
