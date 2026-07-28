import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageBanner from "../components/common/PageBanner";
import ListingFilterBar from "../components/listings/ListingFilterBar";
import PropertyGrid from "../components/listings/PropertyGrid";
import { EMPTY_FILTERS, filterProperties } from "../components/listings/filterProperties";
import { getRentProperties } from "../data/properties";

/**
 * "/kiralik" — kiralık (for-rent) listings page.
 * Mirrors Satilik.jsx exactly, just backed by the rental sample listings.
 */
export default function Kiralik() {
  // The homepage's own search widget (HeroSearchBar) can send a visitor
  // straight here with filters already chosen, via router state.
  const location = useLocation();
  const [filters, setFilters] = useState(location.state?.filters ?? EMPTY_FILTERS);
  const properties = useMemo(
    () => filterProperties(getRentProperties(), filters),
    [filters],
  );

  return (
    <>
      <PageBanner
        title="Kiralık İlanlar"
        subtitle="Aradığınız kiralık daire ve rezidansları burada bulun."
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
