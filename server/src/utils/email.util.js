// server/src/utils/email.util.js
//
// Tek doğruluk kaynağı: e-posta normalizasyonu. `users.email` artık gerçek
// bir UNIQUE kısıtına sahip (bkz. migrations/1700000000014) — normalize
// edilmeden yazılırsa "Ali@x.com" ve "ali@x.com" farklı satır sayılıp bu
// kısıtı atlatabilir, girişte de aynı sebeple eşleşme kaçırılabilir. Bu
// yüzden her yazma/okuma öncesi (login, createTeamMember, updateTeamMember)
// buradan geçirilmesi ZORUNLU.
export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}
