// src/components/listings/filterProperties.test.js
import { describe, it, expect } from "vitest";
import { filterProperties, sortProperties, EMPTY_FILTERS } from "./filterProperties";

function property(overrides) {
  return {
    province: "İstanbul",
    district: "Kadıköy",
    neighborhood: "Moda",
    type: "Daire",
    listingNo: "100001",
    price: "1.000.000 TL",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("filterProperties", () => {
  it("EMPTY_FILTERS ile hiçbir ilan elenmez", () => {
    const list = [property({}), property({ district: "Beşiktaş" })];
    expect(filterProperties(list, EMPTY_FILTERS)).toHaveLength(2);
  });

  it("ilçe filtresi doğru daraltır", () => {
    const list = [property({ district: "Kadıköy" }), property({ district: "Beşiktaş" })];
    const result = filterProperties(list, { ...EMPTY_FILTERS, district: "Kadıköy" });
    expect(result).toHaveLength(1);
    expect(result[0].district).toBe("Kadıköy");
  });

  it("province eksik olan (eski seed) ilanlar İstanbul kabul edilir", () => {
    const list = [property({ province: undefined })];
    const result = filterProperties(list, { ...EMPTY_FILTERS, province: "İstanbul" });
    expect(result).toHaveLength(1);
  });

  it("ilan no filtresi TAM eşleşme değil, alt-dize (substring) arar", () => {
    const list = [property({ listingNo: "123456" })];
    const result = filterProperties(list, { ...EMPTY_FILTERS, listingNo: "234" });
    expect(result).toHaveLength(1);
  });

  it("birden fazla filtre birlikte (AND) uygulanır", () => {
    const list = [
      property({ district: "Kadıköy", type: "Daire" }),
      property({ district: "Kadıköy", type: "Arsa" }),
    ];
    const result = filterProperties(list, { ...EMPTY_FILTERS, district: "Kadıköy", type: "Daire" });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Daire");
  });

  it("başında/sonunda boşluk olan ilan no araması trim edilir", () => {
    const list = [property({ listingNo: "555111" })];
    const result = filterProperties(list, { ...EMPTY_FILTERS, listingNo: "  555  " });
    expect(result).toHaveLength(1);
  });
});

describe("sortProperties", () => {
  it("newest: en yeni önce gelir", () => {
    const eski = property({ createdAt: 1000 });
    const yeni = property({ createdAt: 2000 });
    expect(sortProperties([eski, yeni], "newest")).toEqual([yeni, eski]);
  });

  it("oldest: en eski önce gelir", () => {
    const eski = property({ createdAt: 1000 });
    const yeni = property({ createdAt: 2000 });
    expect(sortProperties([yeni, eski], "oldest")).toEqual([eski, yeni]);
  });

  it("price-asc: fiyata göre artan sıralar", () => {
    const ucuz = property({ price: "500.000 TL" });
    const pahali = property({ price: "2.000.000 TL" });
    expect(sortProperties([pahali, ucuz], "price-asc")).toEqual([ucuz, pahali]);
  });

  it("price-desc: fiyata göre azalan sıralar", () => {
    const ucuz = property({ price: "500.000 TL" });
    const pahali = property({ price: "2.000.000 TL" });
    expect(sortProperties([ucuz, pahali], "price-desc")).toEqual([pahali, ucuz]);
  });

  it("Firestore Timestamp formatındaki (_seconds) createdAt'i de doğru sıralar", () => {
    const eski = property({ createdAt: { _seconds: 1000, _nanoseconds: 0 } });
    const yeni = property({ createdAt: { _seconds: 2000, _nanoseconds: 0 } });
    expect(sortProperties([eski, yeni], "newest")).toEqual([yeni, eski]);
  });

  it("orijinal diziyi MUTATE etmez (kopyası üzerinde sıralar)", () => {
    const list = [property({ createdAt: 1000 }), property({ createdAt: 2000 })];
    const original = [...list];
    sortProperties(list, "oldest");
    expect(list).toEqual(original);
  });
});
