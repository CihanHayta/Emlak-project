import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import ListingFilterBar from "../listings/ListingFilterBar";
import ListingSortBar from "../listings/ListingSortBar";
import PropertyGrid from "../listings/PropertyGrid";
import { EMPTY_FILTERS, DEFAULT_SORT, filterProperties, sortProperties } from "../listings/filterProperties";
import { getSaleProperties, getRentProperties } from "../../data/properties";
import { usePropertiesVersion } from "../../hooks/usePropertiesVersion";
import "./AllListingsSection.css";

const PAGE_SIZE = 12;
const CATEGORY_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "satilik", label: "Satılık" },
  { value: "kiralik", label: "Kiralık" },
];

/**
 * Homepage "Tüm İlanlar" section — a scaled-down copy of the Satılık/Kiralık
 * pages (filter bar + sort bar + grid) so visitors can filter/sort without
 * leaving the homepage, plus a Tümü/Satılık/Kiralık toggle since this section
 * (unlike those two pages) mixes both categories. Shows PAGE_SIZE listings
 * at a time via "Daha Fazla Göster" instead of the full list, since the
 * catalog can run into the hundreds.
 */
export default function AllListingsSection() {
  const [category, setCategory] = useState("all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const propertiesVersion = usePropertiesVersion();

  const baseProperties = useMemo(() => {
    if (category === "satilik") return getSaleProperties();
    if (category === "kiralik") return getRentProperties();
    return [...getSaleProperties(), ...getRentProperties()];
    // propertiesVersion is an intentional cache-busting dependency — see
    // Satilik.jsx's identical comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, propertiesVersion]);

  const properties = useMemo(
    () => sortProperties(filterProperties(baseProperties, filters), sortBy),
    [baseProperties, filters, sortBy],
  );

  const visibleProperties = properties.slice(0, visibleCount);
  const hasMore = visibleCount < properties.length;

  function handleCategoryChange(next) {
    setCategory(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleFiltersChange(next) {
    setFilters(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSortChange(next) {
    setSortBy(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section className="all-listings">
      <div className="all-listings__header">
        <h2 className="all-listings__title">
          <Building2 className="all-listings__title-icon" />
          Tüm İlanlar
        </h2>
        <div className="all-listings__category-toggle" role="group" aria-label="İlan tipi">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleCategoryChange(option.value)}
              className={
                category === option.value
                  ? "all-listings__category-btn all-listings__category-btn--active"
                  : "all-listings__category-btn"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ListingFilterBar filters={filters} onChange={handleFiltersChange} />
      <ListingSortBar count={properties.length} sortBy={sortBy} onSortChange={handleSortChange} />
      <PropertyGrid properties={visibleProperties} />

      {hasMore && (
        <div className="all-listings__load-more">
          <button
            type="button"
            className="all-listings__load-more-btn"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Daha Fazla Göster
          </button>
        </div>
      )}
    </section>
  );
}
