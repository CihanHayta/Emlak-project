// server/tests/crypto.util.test.js
//
// Tenant Instagram/WhatsApp/Firebase token'larının Firestore'da şifreli
// tutulmasını sağlayan tek katman — burada bir bug, tüm tenant'ların
// sırlarının okunabilir hale gelmesi ya da (daha kötüsü) sessizce yanlış
// çözülmesi anlamına gelir. Bu yüzden ayrı, kapsamlı bir test dosyasını hak ediyor.
import { encryptToken, decryptToken } from "../src/utils/crypto.util.js";

describe("crypto.util — encryptToken/decryptToken", () => {
  it("şifreleyip çözünce orijinal metni verir", () => {
    const plaintext = "IGQVJYbG9uZ2xpdmVkdG9rZW4tc2FtcGxl";
    expect(decryptToken(encryptToken(plaintext))).toBe(plaintext);
  });

  it("boş string'i de doğru şifreleyip çözer", () => {
    expect(decryptToken(encryptToken(""))).toBe("");
  });

  it("Türkçe karakterler ve uzun metinler bozulmadan gidip gelir", () => {
    const plaintext = "Şahin Emlak — özel karakter testi: ığüşöç İĞÜŞÖÇ ".repeat(50);
    expect(decryptToken(encryptToken(plaintext))).toBe(plaintext);
  });

  it("her çağrıda farklı bir şifreli çıktı üretir (rastgele IV)", () => {
    const plaintext = "aynı-token";
    const first = encryptToken(plaintext);
    const second = encryptToken(plaintext);
    expect(first).not.toBe(second);
    // ama ikisi de aynı düz metne çözülmeli
    expect(decryptToken(first)).toBe(plaintext);
    expect(decryptToken(second)).toBe(plaintext);
  });

  it("çıktı formatı iv:authTag:ciphertext (üç hex parça)", () => {
    const parts = encryptToken("test").split(":");
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => /^[0-9a-f]+$/.test(p))).toBe(true);
  });

  it("şifreli metin oynanmışsa (tamper) çözme hata fırlatır — sessizce yanlış veri döndürmez", () => {
    const encrypted = encryptToken("gizli-token");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    // ciphertext'in son byte'ını boz.
    const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}${ciphertext.slice(-2) === "00" ? "ff" : "00"}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("authTag oynanmışsa da çözme hata fırlatır", () => {
    const encrypted = encryptToken("gizli-token");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tamperedAuthTag = authTag.slice(0, -2) + (authTag.slice(-2) === "00" ? "ff" : "00");
    expect(() => decryptToken(`${iv}:${tamperedAuthTag}:${ciphertext}`)).toThrow();
  });
});
