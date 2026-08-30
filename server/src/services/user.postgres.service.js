// server/src/services/user.postgres.service.js
//
// AŞAMA (Firebase Auth kaldırma): ekip üyesi (agent/assistant/viewer) CRUD'u
// artık TAMAMEN Postgres — şifre `bcryptjs` ile hash'lenip AYNI INSERT/
// UPDATE ifadesiyle `users.password_hash`'e yazılıyor. Eski Firebase+Postgres
// iki-sistemli "önce Auth'ta oluştur, DB yazımı patlarsa Auth'u geri al"
// dansına artık gerek yok: tek bir atomik SQL ifadesi zaten ya tamamen olur
// ya hiç olmaz, ayrı bir telafi (rollback) adımı gerektirmiyor.
import { userPostgresRepository } from "../repositories/user.postgres.repository.js";
import { sessionRepository } from "../repositories/session.postgres.repository.js";
import { createDefaultUser } from "../models/user.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { hashPassword } from "../utils/password.util.js";
import { normalizeEmail } from "../utils/email.util.js";
import { ApiError } from "../utils/ApiError.js";

const ASSIGNABLE_ROLES = new Set(["agent", "assistant", "viewer"]);
const MIN_PASSWORD_LENGTH = 6;

function assertAssignableRole(role) {
  if (!ASSIGNABLE_ROLES.has(role)) {
    throw ApiError.validation('Rol "agent" (Danışman), "assistant" (Personel) veya "viewer" (Kısıtlı) olmalı.');
  }
}

function assertValidPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.validation(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
  }
}

/** Postgres'in UNIQUE ihlal hata kodu (23505) — `users.email` artık gerçek bir UNIQUE kısıtına sahip (bkz. migrations/1700000000014). */
function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function assertNotOwner(context, id) {
  const existing = await userPostgresRepository.findByUid(context, id);
  if (!existing) throw ApiError.notFound("Kullanıcı bulunamadı.");
  if (existing.role === "owner") throw ApiError.forbidden("Owner hesabı buradan yönetilemez.");
  return existing;
}

export async function listTeamMembers(context) {
  return userPostgresRepository.findAll(context);
}

export async function createTeamMember(context, { email, password, displayName, role }) {
  assertAssignableRole(role);
  assertValidPassword(password);

  const passwordHash = await hashPassword(password);
  const userData = createDefaultUser({
    tenantId: context.tenantId,
    email: normalizeEmail(email),
    displayName: displayName || null,
    role,
  });

  try {
    return await userPostgresRepository.create(context, { ...userData, passwordHash });
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiError.conflict("Bu e-posta adresiyle zaten bir hesap var.");
    throw error;
  }
}

export async function updateTeamMember(context, id, { displayName, role, status, email, password }) {
  await assertNotOwner(context, id);

  if (role !== undefined) assertAssignableRole(role);
  if (status !== undefined && !["active", "passive"].includes(status)) {
    throw ApiError.validation('Durum "active" veya "passive" olmalı.');
  }
  if (password !== undefined) assertValidPassword(password);

  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;
  if (email !== undefined) updates.email = normalizeEmail(email);
  if (password !== undefined) updates.passwordHash = await hashPassword(password);

  if (Object.keys(updates).length === 0) return userPostgresRepository.findByUid(context, id);

  let updated;
  try {
    updated = await userPostgresRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
  } catch (error) {
    if (isUniqueViolation(error)) throw ApiError.conflict("Bu e-posta adresiyle zaten bir hesap var.");
    throw error;
  }

  // Şifre değişti ya da hesap pasife alındıysa, o kullanıcının açık TÜM
  // oturumları (her cihazda) hemen geçersiz kılınır — eski şifreyle/pasif
  // durumdayken açık kalmış bir oturum bir sonraki istekte otomatik düşer.
  if (password !== undefined || status === "passive") {
    await sessionRepository.revokeAllForUser(id);
  }

  return updated;
}

export async function deleteTeamMember(context, id) {
  await assertNotOwner(context, id);
  // Postgres'teki `sessions.user_id` FK'si ON DELETE CASCADE (bkz.
  // migrations/1700000000015) zaten hardDelete ile oturumları temizler,
  // ama burada da açıkça iptal ediyoruz — silme ile CASCADE arasındaki
  // (ihmal edilebilir ama sıfır olmayan) pencerede sızan bir isteğin bile
  // geçmesini istemiyoruz.
  await sessionRepository.revokeAllForUser(id);
  await userPostgresRepository.hardDelete(context, id);
}
