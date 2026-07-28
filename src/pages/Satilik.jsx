import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageBanner from "../components/common/PageBanner";
import ListingFilterBar from "../components/listings/ListingFilterBar";
import PropertyGrid from "../components/listings/PropertyGrid";
import { EMPTY_FILTERS, filterProperties } from "../components/listings/filterProperties";
import { getSaleProperties } from "../data/properties";

/**
 * "/satilik" — satılık (for-sale) listings page.
 *
 * Renders the static sample listings from data/properties.js, filtered
 * live by the Semt/Mahalle/İlan No filter bar. Once listings come from the
 * admin panel, only `getSaleProperties` needs to change (e.g. to a fetched
 * list) — the filtering/grid below stays the same.
 */
export default function Satilik() {
  // The homepage's own search widget (HeroSearchBar) can send a visitor
  // straight here with filters already chosen, via router state.
  const location = useLocation();
  const [filters, setFilters] = useState(location.state?.filters ?? EMPTY_FILTERS);
  const properties = useMemo(
    () => filterProperties(getSaleProperties(), filters),
    [filters],
  );

  return (
    <>
      <PageBanner
        title="Satılık İlanlar"
        subtitle="Bölgenin en güncel satılık daire, villa ve müstakil ev ilanları."
      />

      <section className="mx-auto max-w-7xl px-6">
        <ListingFilterBar filters={filters} onChange={setFilters} />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <PropertyGrid properties={properties} />
      </section>
    </>
  );
}
