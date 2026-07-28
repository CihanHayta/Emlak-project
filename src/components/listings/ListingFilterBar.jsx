import { Search } from "lucide-react";
import { ISTANBUL_DISTRICTS } from "../../data/istanbulLocations";

const ALL_DISTRICTS_VALUE = "";
const ALL_NEIGHBORHOODS_VALUE = "";
const ALL_TYPES_VALUE = "";
// Keep in sync with the `type` values used in data/properties.js.
const PROPERTY_TYPES = ["Daire", "Müstakil", "Arsa"];

/**
 * Search/filter bar shown at the top of the Satılık and Kiralık listing
 * pages: Semt (district) -> Mahalle (neighborhood, cascading based on the
 * chosen district) + Tip (Daire/Müstakil/Arsa) + İlan No. Combining Semt and
 * Tip is what lets a visitor search for something like "Esenyurt" +
 * "Müstakil" or "Esenyurt" + "Arsa".
 *
 * Fully controlled: the parent page (Satilik.jsx/Kiralik.jsx) owns the
 * `filters` state and does the actual filtering of the property list —
 * this component only renders the inputs and reports changes upward via
 * `onChange`. That keeps this file about the UI, and the page about "what
 * counts as a match."
 */
export default function ListingFilterBar({ filters, onChange, onSubmit }) {
  const { district, neighborhood, type, listingNo } = filters;

  const selectedDistrict = ISTANBUL_DISTRICTS.find((d) => d.name === district);
  const neighborhoods = selectedDistrict?.neighborhoods ?? [];

  function handleDistrictChange(event) {
    // Changing the district invalidates whatever neighborhood was picked
    // before (it likely belongs to a different district), so reset it.
    onChange({ ...filters, district: event.target.value, neighborhood: ALL_NEIGHBORHOODS_VALUE });
  }

  function handleNeighborhoodChange(event) {
    onChange({ ...filters, neighborhood: event.target.value });
  }

  function handleTypeChange(event) {
    onChange({ ...filters, type: event.target.value });
  }

  function handleListingNoChange(event) {
    onChange({ ...filters, listingNo: event.target.value });
  }

  function handleSubmit(event) {
    // Filtering already happens live as fields change — this just stops a
    // real page reload if the visitor presses Enter/clicks "Ara". On the
    // homepage's copy of this bar, `onSubmit` additionally navigates to the
    // matching Satılık/Kiralık page with these filters already applied.
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto -mt-8 flex max-w-5xl flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-100 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="semt" className="mb-1 block text-xs font-medium text-gray-500">
          Semt
        </label>
        <select
          id="semt"
          name="semt"
          value={district}
          onChange={handleDistrictChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
        >
          <option value={ALL_DISTRICTS_VALUE}>Tüm Semtler</option>
          {ISTANBUL_DISTRICTS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="mahalle" className="mb-1 block text-xs font-medium text-gray-500">
          Mahalle
        </label>
        <select
          id="mahalle"
          name="mahalle"
          value={neighborhood}
          onChange={handleNeighborhoodChange}
          disabled={!district}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value={ALL_NEIGHBORHOODS_VALUE}>
            {district ? "Tüm Mahalleler" : "Önce semt seçin"}
          </option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-35 flex-1">
        <label htmlFor="tip" className="mb-1 block text-xs font-medium text-gray-500">
          Tip
        </label>
        <select
          id="tip"
          name="tip"
          value={type}
          onChange={handleTypeChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
        >
          <option value={ALL_TYPES_VALUE}>Tüm Tipler</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-35 flex-1">
        <label htmlFor="ilanNo" className="mb-1 block text-xs font-medium text-gray-500">
          İlan No
        </label>
        <input
          id="ilanNo"
          name="ilanNo"
          type="text"
          value={listingNo}
          onChange={handleListingNoChange}
          placeholder="Örn: 10245"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
        />
      </div>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
      >
        <Search className="h-4 w-4" />
        Ara
      </button>
    </form>
  );
}
