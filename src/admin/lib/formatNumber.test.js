// src/admin/lib/formatNumber.test.js
import { describe, it, expect } from "vitest";
import { parseDigits, formatThousands } from "./formatNumber";

describe("parseDigits", () => {
  it("rakam olmayan her şeyi (nokta, boşluk, harf) kaldırır", () => {
    expect(parseDigits("1.500.000 TL")).toBe("1500000");
  });

  it("zaten sadece rakamsa değişmeden döner", () => {
    expect(parseDigits("12345")).toBe("12345");
  });

  it("boş string boş döner", () => {
    expect(parseDigits("")).toBe("");
  });
});

describe("formatThousands", () => {
  it("binlik ayraçlarla (Türkçe format) gösterir", () => {
    expect(formatThousands("1500000")).toBe("1.500.000");
  });

  it("küçük sayılarda ayraç eklemez", () => {
    expect(formatThousands("500")).toBe("500");
  });

  it("boş string için boş döner (0 değil)", () => {
    expect(formatThousands("")).toBe("");
  });

  it("başındaki sıfırları sayı olarak yorumlar (0 basamak kaybolur)", () => {
    expect(formatThousands("00500")).toBe("500");
  });
});

describe("parseDigits + formatThousands birlikte (kullanıcı yazarken tipik akış)", () => {
  it("formatlanmış bir girdiyi tekrar işlemek aynı sonucu verir (idempotent)", () => {
    const formatted = formatThousands(parseDigits("3.500.000"));
    expect(formatThousands(parseDigits(formatted))).toBe(formatted);
  });
});
