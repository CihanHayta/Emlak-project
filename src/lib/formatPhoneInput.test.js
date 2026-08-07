// src/lib/formatPhoneInput.test.js
import { describe, it, expect } from "vitest";
import { formatPhoneInput } from "./formatPhoneInput";

describe("formatPhoneInput", () => {
  it("tam bir numarayı 0555 123 45 67 şeklinde gruplar", () => {
    expect(formatPhoneInput("05551234567")).toBe("0555 123 45 67");
  });

  it("harf/sembol gibi rakam olmayan karakterleri yok sayar", () => {
    expect(formatPhoneInput("0555-123-45-67")).toBe("0555 123 45 67");
    expect(formatPhoneInput("+90 555 123 45 67")).toBe("9055 512 34 56");
  });

  it("11 haneden fazlasını kırpar (kullanıcı fazladan yazsa bile)", () => {
    expect(formatPhoneInput("055512345678999")).toBe("0555 123 45 67");
  });

  it("kademeli olarak yazarken her aşamada doğru gruplanır", () => {
    expect(formatPhoneInput("0")).toBe("0");
    expect(formatPhoneInput("0555")).toBe("0555");
    expect(formatPhoneInput("05551")).toBe("0555 1");
    expect(formatPhoneInput("0555123")).toBe("0555 123");
    expect(formatPhoneInput("05551234")).toBe("0555 123 4");
    expect(formatPhoneInput("055512345")).toBe("0555 123 45");
  });

  it("boş string boş döner", () => {
    expect(formatPhoneInput("")).toBe("");
  });
});
