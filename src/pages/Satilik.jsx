import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageBanner from "../components/common/PageBanner";
import ListingFilterBar from "../components/listings/ListingFilterBar";
import ListingSortBar from "../components/listings/ListingSortBar";
import PropertyGrid from "../components/listings/PropertyGrid";
import { EMPTY_FILTERS, DEFAULT_SORT, filterProperties, sortProperties } from "../components/listings/filterProperties";
import { getSaleProperties } from "../data/properties";
import { usePropertiesVersion } from "../hooks/usePropertiesVersion";
import "./Satilik.css";

/**
 * "/satilik" — satılık (for-sale) listings page.
 *
 * Renders real listings fetched from the backend (data/properties.js),
 * filtered live by the Semt/Mahalle/İlan No filter bar.
 */
export default function Satilik() {
  // The homepage's own search widget (HeroSearchBar) can send a visitor
  // straight here with filters already chosen, via router state.
  const location = useLocation();
  const [filters, setFilters] = useState(location.state?.filters ?? EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const propertiesVersion = usePropertiesVersion();
  const properties = useMemo(
    () => sortProperties(filterProperties(getSaleProperties(), filters), sortBy),
    // getSaleProperties() reads a module-level cache, not a prop/state
    // value — propertiesVersion is the only signal that it just changed
    // (async fetch resolved, or a listing was added/edited/deleted), so it
    // must stay a dependency even though the callback body doesn't
    // reference it directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, sortBy, propertiesVersion],
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
