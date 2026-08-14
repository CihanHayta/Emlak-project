// server/tests/matching.service.test.js
//
// src/admin/lib/matchCustomers.test.js'in backend portu — aynı skorlama
// mantığının burada da (matching.service.js) birebir doğru çalıştığını
// kanıtlıyor. 2026-08-06'da elle bulunan bir kayan-nokta yuvarlama hatasını
// (bütçe toleransının tam sınırındaki bir ilan yanlışlıkla dışlanıyordu)
// kalıcı bir regresyon testine çeviriyor.
import { findMatchingCustomers, getMatchingCustomers } from "../src/services/matching.service.js";
import { customerRepository } from "../src/repositories/customer.repository.js";
import { createDefaultCustomer } from "../src/models/customer.model.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

function customer(overrides) {
  return {
    role: "Alıcı",
    interests: [],
    budgetMin: 0,
    budgetMax: 0,
    desiredProvince: "",
    desiredDistrict: "",
    ...overrides,
  };
}

describe("matching.service — findMatchingCustomers (saf mantık)", () => {
  it("bütçe sınırının TAM ucundaki bir ilanı yanlışlıkla dışlamaz (regresyon)", () => {
    const listing = { type: "Daire", price: "1.725.000 TL", district: "Kadıköy" };
    const musteri = customer({ budgetMin: 1000000, budgetMax: 1500000 });
    expect(findMatchingCustomers(listing, [musteri])).toHaveLength(1);
  });

  it('"Satıcı" rolündeki müşteriler hiç eşleşme adayı olmaz', () => {
    const listing = { type: "Daire", price: "1.000.000 TL" };
    const satici = customer({ role: "Satıcı", interests: ["Daire"] });
    expect(findMatchingCustomers(listing, [satici])).toHaveLength(0);
  });

  it("ilgi alanı (tip) eşleşmesi puan katar", () => {
    const listing = { type: "Daire", price: "0 TL" };
    const eslesen = customer({ interests: ["Daire"] });
    const eslesmeyen = customer({ interests: ["Arsa"] });
    expect(findMatchingCustomers(listing, [eslesen, eslesmeyen]).map((c) => c === eslesen)).toEqual([true]);
  });

  it("ilçe eşleşmesi il eşleşmesinden daha yüksek puanlanır (2 vs 1) — sıralamaya yansır", () => {
    const listing = { type: "Daire", price: "0 TL", district: "Kadıköy", province: "İstanbul" };
    const ilceEslesen = customer({ desiredDistrict: "Kadıköy" });
    const ilEslesen = customer({ desiredProvince: "İstanbul" });
    const [first, second] = findMatchingCustomers(listing, [ilEslesen, ilceEslesen]);
    expect(first).toBe(ilceEslesen);
    expect(second).toBe(ilEslesen);
  });

  it("hiçbir kritere uymayan müşteri sonuçta hiç görünmez", () => {
    const listing = { type: "Daire", price: "0 TL", district: "Kadıköy" };
    const uymayan = customer({ interests: ["Arsa"], desiredDistrict: "Beşiktaş" });
    expect(findMatchingCustomers(listing, [uymayan])).toHaveLength(0);
  });

  it("province belirtilmemiş ilan İstanbul kabul edilir", () => {
    const listing = { type: "Daire", price: "0 TL" };
    const istanbulIsteyen = customer({ desiredProvince: "İstanbul" });
    expect(findMatchingCustomers(listing, [istanbulIsteyen])).toHaveLength(1);
  });

  it("bütçe aralığının çok dışındaki bir ilan puan almaz", () => {
    const listing = { type: "Daire", price: "10.000.000 TL" };
    const musteri = customer({ budgetMin: 500000, budgetMax: 1000000 });
    expect(findMatchingCustomers(listing, [musteri])).toHaveLength(0);
  });

  it("fiyatı 0/boş olan ilan bütçe puanı almaz ama diğer kriterlerle eşleşebilir", () => {
    const listing = { type: "Daire", price: "" };
    const musteri = customer({ interests: ["Daire"], budgetMin: 100, budgetMax: 200 });
    expect(findMatchingCustomers(listing, [musteri])).toHaveLength(1);
  });
});

describe("matching.service — getMatchingCustomers (I/O'lu sürüm)", () => {
  const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

  beforeEach(() => resetMockFirestore());

  it("tenant'ın gerçek müşteri listesini okuyup skorlar", async () => {
    await customerRepository.create(context, createDefaultCustomer({ name: "Eşleşen", interests: ["Daire"] }));
    await customerRepository.create(context, createDefaultCustomer({ name: "Eşleşmeyen", interests: ["Arsa"] }));

    const listing = { id: "p1", type: "Daire", price: "0 TL" };
    const matches = await getMatchingCustomers(context, listing);

    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe("Eşleşen");
  });
});
