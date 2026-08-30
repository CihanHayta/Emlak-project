import { Search } from "lucide-react";
import { ISTANBUL_DISTRICTS } from "../../data/istanbulLocations";
import { TURKEY_PROVINCES } from "../../data/turkeyLocations";
import "./ListingFilterBar.css";

const ALL_DISTRICTS_VALUE = "";
const ALL_NEIGHBORHOODS_VALUE = "";
const ALL_TYPES_VALUE = "";
// Keep in sync with the `type` values used in data/properties.js.
const PROPERTY_TYPES = ["Daire", "Müstakil", "Arsa"];

/**
 * Search/filter bar shown at the top of the Satılık and Kiralık listing
 * pages (and, in a Satılık/Kiralık-toggle wrapper, on the homepage): Şehir
 * (province) -> Semt (district, cascading on the chosen province) ->
 * Mahalle (neighborhood, cascading on the chosen district — only available
 * for İstanbul, since that's the only province with neighborhood-level
 * data) + Tip (Daire/Müstakil/Arsa) + İlan No.
 *
 * Fully controlled: the parent page (Satilik.jsx/Kiralik.jsx/HeroSearchBar)
 * owns the `filters` state and does the actual filtering of the property
 * list — this component only renders the inputs and reports changes
 * upward via `onChange`. That keeps this file about the UI, and the page
 * about "what counts as a match."
 */
export default function ListingFilterBar({ filters, onChange, onSubmit }) {
  const { province, district, neighborhood, type, listingNo } = filters;
  const isIstanbul = province === "İstanbul";

  const districts = isIstanbul
    ? ISTANBUL_DISTRICTS.map((d) => d.name)
    : (TURKEY_PROVINCES.find((p) => p.name === province)?.districts ?? []);

  const selectedIstanbulDistrict = isIstanbul ? ISTANBUL_DISTRICTS.find((d) => d.name === district) : null;
  const neighborhoods = selectedIstanbulDistrict?.neighborhoods ?? [];

  function handleProvinceChange(event) {
    // Changing the city invalidates whatever district/neighborhood was
    // picked before (they likely belong to a different city), so reset both.
    onChange({ ...filters, province: event.target.value, district: ALL_DISTRICTS_VALUE, neighborhood: ALL_NEIGHBORHOODS_VALUE });
  }

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
    <form onSubmit={handleSubmit} className="filter-bar">
      <div className="filter-bar__field filter-bar__field--city">
        <label htmlFor="sehir" className="filter-bar__label">
          Şehir
        </label>
        <select id="sehir" name="sehir" value={province} onChange={handleProvinceChange} className="filter-bar__input">
          {TURKEY_PROVINCES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar__field">
        <label htmlFor="semt" className="filter-bar__label">
          Semt
        </label>
        <select id="semt" name="semt" value={district} onChange={handleDistrictChange} className="filter-bar__input">
          <option value={ALL_DISTRICTS_VALUE}>Tüm Semtler</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar__field">
        <label htmlFor="mahalle" className="filter-bar__label">
          Mahalle
        </label>
        <select
          id="mahalle"
          name="mahalle"
          value={neighborhood}
          onChange={handleNeighborhoodChange}
          disabled={!district || !isIstanbul}
          className="filter-bar__input"
        >
          <option value={ALL_NEIGHBORHOODS_VALUE}>
            {!isIstanbul ? "Mahalle verisi yok" : district ? "Tüm Mahalleler" : "Önce semt seçin"}
          </option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar__field filter-bar__field--narrow">
        <label htmlFor="tip" className="filter-bar__label">
          Tip
        </label>
        <select id="tip" name="tip" value={type} onChange={handleTypeChange} className="filter-bar__input">
          <option value={ALL_TYPES_VALUE}>Tüm Tipler</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar__field filter-bar__field--narrow">
        <label htmlFor="ilanNo" className="filter-bar__label">
          İlan No
        </label>
        <input
          id="ilanNo"
          name="ilanNo"
          type="text"
          value={listingNo}
          onChange={handleListingNoChange}
          placeholder="Örn: 10245"
          className="filter-bar__input"
        />
      </div>

      <button type="submit" className="filter-bar__submit">
        <Search className="icon-4" />
        Ara
      </button>
    </form>
  );
}
