// server/tests/pagination.test.js
import { parsePageParams, buildMeta } from "../src/utils/pagination.js";

describe("pagination.js — parsePageParams", () => {
  it("query boşsa makul varsayılanlara düşer", () => {
    expect(parsePageParams({})).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("geçerli page/limit doğru okunur, offset doğru hesaplanır", () => {
    expect(parsePageParams({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it("page 0 veya negatifse 1'e sabitlenir", () => {
    expect(parsePageParams({ page: "0" }).page).toBe(1);
    expect(parsePageParams({ page: "-5" }).page).toBe(1);
  });

  it("limit MAX_LIMIT'i (100) aşarsa kırpılır", () => {
    expect(parsePageParams({ limit: "5000" }).limit).toBe(100);
  });

  it("limit negatifse en az 1'e sabitlenir", () => {
    expect(parsePageParams({ limit: "-10" }).limit).toBe(1);
  });

  // `Number.parseInt("0", 10) || DEFAULT_LIMIT` deseninde 0, JS'te falsy
  // olduğundan "hiç belirtilmemiş" gibi ele alınıp varsayılana (20) düşer —
  // bug değil, `||` operatörünün bilinçli (ama sürpriz olabilecek) sonucu.
  it("limit=0 'belirtilmemiş' sayılıp varsayılana (20) düşer", () => {
    expect(parsePageParams({ limit: "0" }).limit).toBe(20);
  });

  it("sayısal olmayan değerler (NaN) hata fırlatmadan varsayılana düşer", () => {
    expect(parsePageParams({ page: "abc", limit: "xyz" })).toEqual({ page: 1, limit: 20, offset: 0 });
  });
});

describe("pagination.js — buildMeta", () => {
  it("hasNext, daha fazla kayıt varken true döner", () => {
    expect(buildMeta({ page: 1, limit: 20, total: 50 })).toEqual({ page: 1, limit: 20, total: 50, hasNext: true });
  });

  it("son sayfadayken hasNext false döner", () => {
    expect(buildMeta({ page: 3, limit: 20, total: 50 }).hasNext).toBe(false);
  });

  it("tam sınırda (page*limit === total) hasNext false döner", () => {
    expect(buildMeta({ page: 2, limit: 25, total: 50 }).hasNext).toBe(false);
  });
});
