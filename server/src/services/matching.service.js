// server/src/services/matching.service.js
//
// src/admin/lib/matchCustomers.js'in BİREBİR portu — "bu ilana uygun N
// müşteri bulundu" penceresinin skorlama mantığıyla aynı, otomasyonun
// (bkz. automation.service.js) hangi müşterileri bilgilendireceğine karar
// vermesi için backend'de de gerekiyor. Frontend dosyası bilerek
// DEĞİŞMEDİ/silinmedi — admin panelindeki "eşleşen müşteriler" penceresi
// hâlâ kendi (senkron, in-memory) kopyasını kullanıyor; iki kopyanın aynı
// mantığı üretmesi önemli, biri değişirse diğeri de güncellenmeli.
// BİLEREK sadece PROPERTIES (İlanlar) için kullanılır, Araçlar için DEĞİL —
// skorlama `listing.type`/`rooms`/`province`/`district` gibi alanlara
// bakıyor, araç ilanlarında bunların hiçbiri yok (brand/model/bodyType
// var). Araçları buraya bağlamak sessizce hiçbir zaman eşleşmeyen, kırık
// bir özellik olurdu — bu yüzden "Yeni İlan Eşleşmesi" otomasyonu SADECE
// property.service.js#createProperty/updateProperty'den tetikleniyor.
import { customerRepository } from "../repositories/customer.repository.js";

function parsePriceNumber(priceText) {
  const digits = (priceText ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

/** Saf mantık (I/O yok) — bkz. testler. */
export function findMatchingCustomers(listing, customers) {
  const listingPrice = parsePriceNumber(listing.price);
  const listingProvince = listing.province ?? "İstanbul";

  return customers
    .filter((customer) => customer.role !== "Satıcı")
    .map((customer) => {
      const interests = customer.interests ?? [];
      let score = 0;

      if (interests.includes(listing.type)) score += 1;
      if (listing.rooms && interests.includes(listing.rooms)) score += 1;
      if (customer.desiredProvince && customer.desiredProvince === listingProvince) score += 1;
      if (customer.desiredDistrict && listing.district && customer.desiredDistrict === listing.district) score += 2;
      if (
        listingPrice > 0 &&
        customer.budgetMin &&
        customer.budgetMax &&
        listingPrice >= Math.round(customer.budgetMin * 0.85) &&
        listingPrice <= Math.round(customer.budgetMax * 1.15)
      ) {
        score += 2;
      }

      return { customer, score };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((match) => match.customer);
}

/** I/O'lu sürüm — automation.service.js buradan çağırır. */
export async function getMatchingCustomers(context, listing) {
  const customers = await customerRepository.findAll(context);
  return findMatchingCustomers(listing, customers);
}
