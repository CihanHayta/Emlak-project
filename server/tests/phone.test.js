import { normalizeTrPhone, isValidTrPhone, formatTrPhoneForDisplay } from "../src/utils/phone.js";

describe("normalizeTrPhone", () => {
  it("10 haneli, 5 ile başlayan mobil numarayı normalize eder", () => {
    expect(normalizeTrPhone("5551234567")).toBe("+905551234567");
  });

  it("11 haneli, 0 ile başlayan numarayı normalize eder", () => {
    expect(normalizeTrPhone("05551234567")).toBe("+905551234567");
  });

  it("12 haneli, 90 ile başlayan numarayı normalize eder", () => {
    expect(normalizeTrPhone("905551234567")).toBe("+905551234567");
  });

  it("boşluk/parantez/tire gibi biçimlendirme karakterlerini yok sayar", () => {
    expect(normalizeTrPhone("0555 123 45 67")).toBe("+905551234567");
    expect(normalizeTrPhone("(0555) 123-45-67")).toBe("+905551234567");
  });

  it("13 haneli, 900 ile başlayan (yaygın '+90 0555...' yazım hatası) numarayı reddeder", () => {
    // Gerçek kullanıcı senaryosu: "+90 0555 123 45 67" yazarsa digits="9005551234567" (13 hane) olur.
    expect(normalizeTrPhone("+90 0555 123 45 67")).toBeNull();
  });

  it("boş/null/undefined girdiyi reddeder", () => {
    expect(normalizeTrPhone("")).toBeNull();
    expect(normalizeTrPhone(null)).toBeNull();
    expect(normalizeTrPhone(undefined)).toBeNull();
  });

  it("çok kısa/çok uzun (ilgisiz uzunlukta) numarayı reddeder", () => {
    expect(normalizeTrPhone("12345")).toBeNull();
    expect(normalizeTrPhone("1234567890123456")).toBeNull();
  });

  it("0212 123 45 67 gibi normal yazılmış bir sabit hat numarasını doğru normalize eder (11 hane, '0' ile başlıyor)", () => {
    expect(normalizeTrPhone("0212 123 45 67")).toBe("+902121234567");
  });

  it("REGRESYON RİSKİ: başında SIFIR OLMADAN yazılan 10 haneli sabit hat numarasını reddediyor (mobil değil, '5' ile başlamıyor)", () => {
    // Dosya başlığı "mobil/sabit hat kapsıyor" diyor ama kod, 10 haneli
    // dallanmada SADECE "5" ile başlayanı (mobil) kabul ediyor — başında
    // 0 olmadan yazılmış bir sabit hat ("2121234567", 10 hane) reddediliyor.
    // Nadir bir girdi şekli (insanlar sabit hattı genelde başında 0'la
    // yazar) ama dosyanın kendi belgelediği kapsamla gerçek davranış
    // burada tam örtüşmüyor — bilinen bir sınır olarak not düşülüyor.
    expect(normalizeTrPhone("2121234567")).toBeNull();
  });
});

describe("isValidTrPhone", () => {
  it("geçerli numara için true, geçersiz için false döner", () => {
    expect(isValidTrPhone("05551234567")).toBe(true);
    expect(isValidTrPhone("abc")).toBe(false);
  });
});

describe("formatTrPhoneForDisplay", () => {
  it("+90'lı E.164 numarayı '0555 123 45 67' biçimine çevirir", () => {
    expect(formatTrPhoneForDisplay("+905551234567")).toBe("0555 123 45 67");
  });

  it("normalize + display gidiş-dönüşü kayıpsız", () => {
    const normalized = normalizeTrPhone("0555 123 45 67");
    expect(formatTrPhoneForDisplay(normalized)).toBe("0555 123 45 67");
  });

  it("+90 ile başlamayan/boş girdide olduğu gibi (ya da boş string) döner, hata fırlatmaz", () => {
    expect(formatTrPhoneForDisplay(null)).toBe("");
    expect(formatTrPhoneForDisplay("+15551234567")).toBe("+15551234567");
  });
});
