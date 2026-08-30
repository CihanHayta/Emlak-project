// server/src/utils/password.util.js
//
// Şifre hash'leme — Firebase Auth kaldırıldıktan sonra kimlik doğrulamanın
// TEK kriptografik temeli burası. `bcryptjs` (native derleme gerektirmeyen
// saf JS implementasyon) bilerek seçildi: bu boyuttaki bir ekip için (bir
// avuç kullanıcı, düşük giriş sıklığı) performans farkı hiç önemli değil,
// ama Railway/Vercel gibi platformlarda native `bcrypt`'in derleme
// adımının başarısız olma riskini tamamen ortadan kaldırıyor — "en az
// bağımlılık/bakım" kriteriyle doğrudan örtüşüyor.
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** `hash` null/undefined olabilir (ör. henüz şifre set edilmemiş bir hesap) — bu durumda her zaman false döner, bcrypt'e boş hash verilmez. */
export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
