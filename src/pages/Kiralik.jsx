import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageBanner from "../components/common/PageBanner";
import ListingFilterBar from "../components/listings/ListingFilterBar";
import ListingSortBar from "../components/listings/ListingSortBar";
import PropertyGrid from "../components/listings/PropertyGrid";
import { EMPTY_FILTERS, DEFAULT_SORT, filterProperties, sortProperties } from "../components/listings/filterProperties";
import { getRentProperties } from "../data/properties";
import { usePropertiesVersion } from "../hooks/usePropertiesVersion";
import "./Kiralik.css";

/**
 * "/kiralik" — kiralık (for-rent) listings page.
 * Mirrors Satilik.jsx exactly, just backed by the rental sample listings.
 */
export default function Kiralik() {
  // The homepage's own search widget (HeroSearchBar) can send a visitor
  // straight here with filters already chosen, via router state.
  const location = useLocation();
  const [filters, setFilters] = useState(location.state?.filters ?? EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const propertiesVersion = usePropertiesVersion();
  const properties = useMemo(
    () => sortProperties(filterProperties(getRentProperties(), filters), sortBy),
    // See Satilik.jsx's identical comment: propertiesVersion is an
    // intentional cache-busting dependency, not one exhaustive-deps can see
    // referenced in the callback body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, sortBy, propertiesVersion],
  );

  return (
    <>
      <PageBanner
        title="Kiralık İlanlar"
        subtitle="Aradığınız kiralık daire ve rezidansları burada bulun."
      />

      <section className="listing-page__filter-section">
        <ListingFilterBar filters={filters} onChange={setFilters} />
      </section>

      <section className="listing-page__grid-section">
        <ListingSortBar count={properties.length} sortBy={sortBy} onSortChange={setSortBy} />
        <PropertyGrid properties={properties} />
      </section>
    </>
  );
}
