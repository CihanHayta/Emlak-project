/**
 * "Bu ilana uygun N eski müşteri bulundu" — scores every buyer-role
 * customer against a listing (type/room count, location, budget) so a
 * fresh listing can immediately surface everyone in the CRM who might
 * actually want it, instead of the agency having to remember who asked
 * for what.
 *
 * A simple additive score (not a strict AND filter) — a customer only
 * needs to match on *something* to show up, ranked by how well they match.
 */
function parsePriceNumber(priceText) {
  const digits = (priceText ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function findMatchingCustomers(listing, customers) {
  const listingPrice = parsePriceNumber(listing.price);
  // Sample listings pre-date the "province" field (they were Istanbul-only
  // public site data) — assume İstanbul when it's missing.
  const listingProvince = listing.province ?? "İstanbul";

  return customers
    .filter((customer) => customer.role !== "Satıcı") // a seller isn't a lead for buying/renting
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
        listingPrice >= customer.budgetMin * 0.85 &&
        listingPrice <= customer.budgetMax * 1.15
      ) {
        score += 2;
      }

      return { customer, score };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((match) => match.customer);
}
