// server/src/utils/crypto.util.js
//
// Tenant başına saklanan Instagram access token'larını Firestore'da
// düz metin tutmamak için AES-256-GCM ile şifreler/çözer — tek bir global
// env değişkeniydi (INSTAGRAM_ACCESS_TOKEN) artık her tenant'ın kendi
// token'ı Firestore'da duruyor, DB'ye salt-okunur erişimi olan biri bile
// bunları okuyamamalı.
import crypto from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM için önerilen 96 bit.

function getKey() {
  // TOKEN_ENCRYPTION_KEY: 64 karakterlik hex string (32 byte) bekleniyor —
  // env.js zaten bunu doğrulayıp burada `Buffer` olarak sağlıyor.
  return env.tokenEncryptionKey;
}

/** `plaintext` → `"iv:authTag:ciphertext"` (hepsi hex). */
export function encryptToken(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** `encryptToken()`'ın tersi — bozuk/yanlış anahtarla şifrelenmiş bir değer verilirse fırlatır (sessizce yanlış veri döndürmez). */
export function decryptToken(encoded) {
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
