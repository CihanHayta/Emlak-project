// server/src/services/user.service.js
//
// Ekip üyesi (Danışman/Personel) yönetimi — SADECE admin (owner) tarafından
// çağrılır (bkz. routes/user.routes.js'in authorize("users:write") kapısı).
// Kendi kendine kayıt YOK: Firebase Auth hesabı ve Firestore `users/{uid}`
// dokümanı her zaman birlikte, bu servis üzerinden, admin tarafından oluşur.
import { getAuthClient } from "../firebase/auth.client.js";
import { userRepository } from "../repositories/user.repository.js";
import { createDefaultUser } from "../models/user.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

// Admin bu uç noktadan sadece bu üç rolü oluşturabilir/atayabilir —
// "owner" sadece scripts/bootstrap-owner.js ile, ofis başına bir kez var
// olur. "viewer" (Kısıtlı — permissions.js'de hep tanımlıydı, sadece okuma
// izni) 2026-08-13'e kadar burada eksikti; ürün "salt-okunur personel"
// rolü olarak satılıyorsa atanabilir olması gerekiyordu.
const ASSIGNABLE_ROLES = new Set(["agent", "assistant", "viewer"]);

function assertAssignableRole(role) {
  if (!ASSIGNABLE_ROLES.has(role)) {
    throw ApiError.validation('Rol "agent" (Danışman), "assistant" (Personel) veya "viewer" (Kısıtlı) olmalı.');
  }
}

async function assertNotOwner(context, id) {
  const existing = await userRepository.findByUid(context, id);
  if (!existing) throw ApiError.notFound("Kullanıcı bulunamadı.");
  if (existing.role === "owner") throw ApiError.forbidden("Owner hesabı buradan yönetilemez.");
  return existing;
}

export async function listTeamMembers(context) {
  return userRepository.findAll(context);
}

/**
 * Firebase Auth hesabı + Firestore doküman + custom claims — üçü birlikte
 * oluşturulur. Firestore yazımı (ya da claims) başarısız olursa az önce
 * açılan Auth hesabı geri alınır (rollback) — Auth'ta yaşayıp Firestore'da
 * hiç görünmeyen "hayalet" bir hesap kalmasın diye.
 */
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
    const created = await userRepository.createWithUid(context, userRecord.uid, userData);
    await auth.setCustomUserClaims(userRecord.uid, { tenantId: context.tenantId, role });
    return created;
  } catch (error) {
    await auth.deleteUser(userRecord.uid).catch(() => {});
    throw error;
  }
}

/**
 * `role`/`email`/`password`/`status` hepsi opsiyonel — sadece gönderilenler
 * güncellenir. `status` değişirse Firebase Auth hesabı da senkron olarak
 * disable/enable edilir ("pasif" gerçekten giriş yapamasın diye, sadece
 * kozmetik bir etiket olmasın). `role` değişirse custom claims yeniden set
 * edilir — o kullanıcının ELİNDEKİ mevcut idToken'da bu hemen görünmez,
 * bir sonraki token yenilemesinde (ya da yeniden girişte) etkin olur.
 */
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

  const firestoreUpdates = {};
  if (displayName !== undefined) firestoreUpdates.displayName = displayName;
  if (role !== undefined) firestoreUpdates.role = role;
  if (status !== undefined) firestoreUpdates.status = status;
  if (email !== undefined) firestoreUpdates.email = email;

  if (Object.keys(firestoreUpdates).length === 0) return userRepository.findByUid(context, id);
  return userRepository.update(context, id, withUpdateFields(firestoreUpdates, { actorUserId: context.userId }));
}

/**
 * Hard delete — hem Firebase Authentication'dan hem Firestore'dan. Önce Auth
 * hesabı silinir (bu, hesabın tüm token'larını/oturumlarını anında
 * geçersiz kılar), sonra Firestore dokümanı — bu sırayla, Firestore'dan
 * silinip Auth'ta "hayalet" bir hesap olarak oturum açabilen bir kullanıcı
 * kalma riski hiç oluşmaz.
 */
export async function deleteTeamMember(context, id) {
  await assertNotOwner(context, id);

  const auth = await getAuthClient();
  await auth.deleteUser(id).catch((error) => {
    if (error.code !== "auth/user-not-found") throw error;
  });
  await userRepository.hardDelete(context, id);
}
