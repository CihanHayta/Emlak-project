import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS } from "./filterProperties";
import "./ListingSortBar.css";

/**
 * Sits between the filter bar and the results grid on Satılık/Kiralık:
 * result count on the left, "Sırala" dropdown on the right. Fully
 * controlled, same pattern as ListingFilterBar — the parent page owns the
 * sort value and actually sorts the list via sortProperties().
 */
export default function ListingSortBar({ count, sortBy, onSortChange }) {
  return (
    <div className="listing-sort-bar">
      <p className="listing-sort-bar__count">
        <strong>{count}</strong> ilan bulundu
      </p>

      <label className="listing-sort-bar__sort">
        <ArrowUpDown className="icon-4" />
        <span className="listing-sort-bar__sort-label">Sırala:</span>
        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
          className="listing-sort-bar__select"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
