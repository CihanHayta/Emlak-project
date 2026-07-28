/** The "no filter applied" state for the Semt/Mahalle/Tip/İlan No filter bar. */
export const EMPTY_FILTERS = { district: "", neighborhood: "", type: "", listingNo: "" };

/**
 * Applies the Semt/Mahalle/Tip/İlan No filters (from ListingFilterBar) to a
 * list of properties. An empty value for any filter means "don't filter on
 * this" — e.g. district="Esenyurt" + type="Müstakil" narrows down to just
 * Esenyurt's detached houses.
 *
 * İlan No matches as a substring so visitors don't have to type the exact
 * full number.
 */
export function filterProperties(properties, filters) {
  const { district, neighborhood, type, listingNo } = filters;
  const query = listingNo.trim();

  return properties.filter((property) => {
    if (district && property.district !== district) return false;
    if (neighborhood && property.neighborhood !== neighborhood) return false;
    if (type && property.type !== type) return false;
    if (query && !property.listingNo.includes(query)) return false;
    return true;
  });
}
