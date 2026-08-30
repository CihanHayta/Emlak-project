import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingFilterBar from "../listings/ListingFilterBar";
import { EMPTY_FILTERS } from "../listings/filterProperties";
import "./HeroSearchBar.css";

const CATEGORY_TABS = [
  { value: "satilik", label: "" },
  { value: "kiralik", label: "Kiralık" },
];

/**
 * The homepage's own search widget, overlapping the bottom of the hero
 * slider — the same Semt/Mahalle/Tip/İlan No filter bar used on the
 * Satılık/Kiralık pages (see components/listings/ListingFilterBar.jsx), so
 * a visitor can start narrowing down right from "/" instead of having to
 * land on a listing page first. Picking Satılık/Kiralık + filters and
 * hitting "Ara" navigates to that page with the filters already applied.
 */
export default function HeroSearchBar() {
  const [category, setCategory] = useState("satilik");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const navigate = useNavigate();

  function goToListings() {
    navigate(`/${category}`, { state: { filters } });
  }

  return (
    <div className="hero-search">
      <div className="hero-search__tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setCategory(tab.value)}
            className={`hero-search__tab${category === tab.value ? " hero-search__tab--active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ListingFilterBar filters={filters} onChange={setFilters} onSubmit={goToListings} />
    </div>
  );
}
