// server/tests/slugify.test.js
import { slugify } from "../src/utils/slugify.js";

describe("slugify", () => {
  it("boşlukları tireye çevirir, küçük harfe indirir", () => {
    expect(slugify("Sahin Emlak")).toBe("sahin-emlak");
  });

  it("Türkçe karakterleri doğru dönüştürür", () => {
    expect(slugify("Şahin Emlak Gölbaşı İçkale Çınarlı Üsküdar Öztürk ığ")).toBe(
      "sahin-emlak-golbasi-ickale-cinarli-uskudar-ozturk-ig",
    );
  });

  it("özel karakterleri tireyle değiştirir", () => {
    expect(slugify("Yaz Kampanyası (2026)! %50 İndirim")).toBe("yaz-kampanyasi-2026-50-indirim");
  });

  it("baştaki/sondaki tireleri kırpar", () => {
    expect(slugify("  -Merhaba Dünya-  ")).toBe("merhaba-dunya");
  });

  it("ardışık boşluk/özel karakterleri tek tireye indirger", () => {
    expect(slugify("a    b---c")).toBe("a-b-c");
  });

  it("boş string boş döner", () => {
    expect(slugify("")).toBe("");
  });

  it("sadece özel karakterlerden oluşan bir string boş döner", () => {
    expect(slugify("!!! ??? ***")).toBe("");
  });

  it("sayıları korur", () => {
    expect(slugify("2026 Yılı 3. Çeyrek")).toBe("2026-yili-3-ceyrek");
  });
});
