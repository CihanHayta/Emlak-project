import { useMemo, useState } from "react";
import PageBanner from "../components/common/PageBanner";
import VehicleCard from "../components/common/VehicleCard";
import { getAllVehicles } from "../data/vehicles";
import { useVehiclesVersion } from "../hooks/useVehiclesVersion";
import "./Satilik.css";
import "../components/listings/PropertyGrid.css";
import "../components/listings/ListingSortBar.css";
import "./Araclar.css";

const ALL = "tumu";

/**
 * "/araclar" — satılık/kiralık araç ilanları. Satilik.jsx/Kiralik.jsx'ten
 * farklı olarak İKİSİ tek bir sayfada, üstte basit bir kategori seçiciyle
 * (emlaktaki kadar hacim beklenmediği için ayrı iki route'a gerek yok).
 */
export default function Araclar() {
  const [category, setCategory] = useState(ALL);
  const vehiclesVersion = useVehiclesVersion();
  const vehicles = useMemo(
    () => getAllVehicles().filter((v) => category === ALL || v.category === category),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getAllVehicles() modül seviyesi bir cache okuyor, propertiesVersion tek değişim sinyali (bkz. filterProperties.js'teki aynı desen).
    [category, vehiclesVersion],
  );

  return (
    <>
      <PageBanner title="Araçlar" subtitle="Satılık ve kiralık araç ilanlarımız." />

      <section className="listing-page__filter-section">
        <div className="araclar-filter-bar">
          {[
            { value: ALL, label: "Tümü" },
            { value: "satilik", label: "Satılık" },
            { value: "kiralik", label: "Kiralık" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={`araclar-filter-bar__chip${category === option.value ? " araclar-filter-bar__chip--active" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="listing-page__grid-section">
        <p className="listing-sort-bar__count">{vehicles.length} araç bulundu.</p>
        {vehicles.length === 0 ? (
          <p className="property-grid__empty">Bu kritere uygun araç bulunamadı.</p>
        ) : (
          <div className="property-grid">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
