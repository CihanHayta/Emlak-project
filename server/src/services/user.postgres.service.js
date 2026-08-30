// server/src/services/user.postgres.service.js
//
// user.service.js'in (Firestore) PostgreSQL karşılığı — SADECE Firestore
// okuma/yazma kısmı (userRepository → userPostgresRepository) değişti.
// `getAuthClient()` BİLEREK HÂLÂ `firebase/auth.client.js`'ten geliyor ve
// HİÇ DOKUNULMADI: Firebase Authentication bu aşamada değişmiyor (Aşama 12,
// ayrı bir karar). Bu servis dolayısıyla kasıtlı olarak "yarı Postgres yarı
// Firebase" — ama property.postgres.service.js'teki otomasyon durumundan
// FARKLI: o ORADA henüz taşınmamış bir DOMAIN'e (customers/automationEvents)
// bağımlıydı ve o yüzden çıkarıldı; buradaki Auth bağımlılığı ise Aşama
// 12'ye kadar KALICI OLARAK planlanmış, geçici bir eksiklik değil.
import { getAuthClient } from "../firebase/auth.client.js";
import { userPostgresRepository } from "../repositories/user.postgres.repository.js";
import { createDefaultUser } from "../models/user.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

const ASSIGNABLE_ROLES = new Set(["agent", "assistant", "viewer"]);

function assertAssignableRole(role) {
  if (!ASSIGNABLE_ROLES.has(role)) {
    throw ApiError.validation('Rol "agent" (Danışman), "assistant" (Personel) veya "viewer" (Kısıtlı) olmalı.');
  }
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

  const auth = await getAuthClient();
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: displayName || undefined });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw ApiError.conflict("Bu e-posta adresiyle zaten bir hesap var.");
    }
    if (error.code === "auth/invalid-password") {
      throw ApiError.validation("Şifre en az 6 karakter olmalı.");
    }
    throw error;
  }

  try {
    const userData = createDefaultUser({ tenantId: context.tenantId, email, displayName: displayName || null, role });
    const created = await userPostgresRepository.createWithUid(context, userRecord.uid, userData);
    await auth.setCustomUserClaims(userRecord.uid, { tenantId: context.tenantId, role });
    return created;
  } catch (error) {
    await auth.deleteUser(userRecord.uid).catch(() => {});
    throw error;
  }
}

export async function updateTeamMember(context, id, { displayName, role, status, email, password }) {
  await assertNotOwner(context, id);
  if (role !== undefined) assertAssignableRole(role);
  if (status !== undefined && status !== "active" && status !== "passive") {
    throw ApiError.validation('Durum "active" veya "passive" olmalı.');
  }

  const auth = await getAuthClient();
  const authUpdates = {};
  if (email !== undefined) authUpdates.email = email;
  if (password !== undefined) {
    if (password.length < 6) throw ApiError.validation("Şifre en az 6 karakter olmalı.");
    authUpdates.password = password;
  }
  if (status !== undefined) authUpdates.disabled = status === "passive";
  if (displayName !== undefined) authUpdates.displayName = displayName;

  if (Object.keys(authUpdates).length > 0) {
    try {
      await auth.updateUser(id, authUpdates);
    } catch (error) {
      if (error.code === "auth/email-already-exists") {
        throw ApiError.conflict("Bu e-posta adresiyle zaten bir hesap var.");
      }
      throw error;
    }
  }

  if (role !== undefined) {
    await auth.setCustomUserClaims(id, { tenantId: context.tenantId, role });
  }

  const dbUpdates = {};
  if (displayName !== undefined) dbUpdates.displayName = displayName;
  if (role !== undefined) dbUpdates.role = role;
  if (status !== undefined) dbUpdates.status = status;
  if (email !== undefined) dbUpdates.email = email;

  if (Object.keys(dbUpdates).length === 0) return userPostgresRepository.findByUid(context, id);
  return userPostgresRepository.update(context, id, withUpdateFields(dbUpdates, { actorUserId: context.userId }));
}

export async function deleteTeamMember(context, id) {
  await assertNotOwner(context, id);

  const auth = await getAuthClient();
  await auth.deleteUser(id).catch((error) => {
    if (error.code !== "auth/user-not-found") throw error;
  });
  await userPostgresRepository.hardDelete(context, id);
}
