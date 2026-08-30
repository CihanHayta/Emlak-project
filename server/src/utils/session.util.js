// server/src/utils/session.util.js
//
// Oturum token'ı üretimi/hash'lenmesi. Çerezde duran değer HER ZAMAN ham
// token'dır (32 rastgele bayt, hex) — DB'de HER ZAMAN sadece SHA-256'sı
// tutulur (bkz. migrations/1700000000015_create-sessions-table.js). Bu
// ayrım bilinçli: DB'ye salt-okunur erişimi olan biri (ör. bir yedek
// dosyası sızarsa) tek başına hiçbir oturumu ele geçiremez, çünkü hash'ten
// ham token'a geri dönülemez. Token 32 bayt (256 bit) entropiye sahip —
// tahmin/brute-force ihtimali pratikte sıfır, bu yüzden HMAC imzalamaya ya
// da ayrı bir SESSION_SECRET env değişkenine gerek yok (bkz. auth.service.js).
import { randomBytes, createHash } from "node:crypto";

export function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
