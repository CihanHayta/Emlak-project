import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageBanner from "../components/common/PageBanner";
import ListingFilterBar from "../components/listings/ListingFilterBar";
import ListingSortBar from "../components/listings/ListingSortBar";
import PropertyGrid from "../components/listings/PropertyGrid";
import { EMPTY_FILTERS, DEFAULT_SORT, filterProperties, sortProperties } from "../components/listings/filterProperties";
import { getSaleProperties } from "../data/properties";
import "./Satilik.css";

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
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const properties = useMemo(
    () => sortProperties(filterProperties(getSaleProperties(), filters), sortBy),
    [filters, sortBy],
  );

  return (
    <>
      <PageBanner
        title="Satılık İlanlar"
        subtitle="Bölgenin en güncel satılık daire, villa ve müstakil ev ilanları."
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
