import "./CarDamageDiagram.css";

// Admin/pages/VehicleForm.jsx'teki PART_NAME_OPTIONS ile birebir aynı 13
// parça — basitleştirilmiş, üstten görünüm bir "araç" grid'i olarak
// düzenlendi (gerçekçi bir SVG çizim değil, ama aynı fikri veriyor: hangi
// parça nerede ve ne durumda).
const LAYOUT = [
  ["Sol Ön Çamurluk", "Ön Tampon", "Sağ Ön Çamurluk"],
  ["Sol Ön Kapı", "Kaput", "Sağ Ön Kapı"],
  [null, "Tavan", null],
  ["Sol Arka Kapı", "Bagaj Kapağı", "Sağ Arka Kapı"],
  ["Sol Arka Çamurluk", "Arka Tampon", "Sağ Arka Çamurluk"],
];

const STATUS_CLASS = {
  "Orijinal": "car-diagram__cell--original",
  "Boyalı": "car-diagram__cell--painted",
  "Lokal Boyalı": "car-diagram__cell--local-painted",
  "Değişen": "car-diagram__cell--changed",
};

const LEGEND = [
  { status: "Orijinal", label: "Orijinal" },
  { status: "Boyalı", label: "Boyalı" },
  { status: "Lokal Boyalı", label: "Lokal Boyalı" },
  { status: "Değişen", label: "Değişen" },
];

/** partsStatus: [{ part, status }] — bkz. vehicle.model.js. Girilmemiş parçalar "bilgi yok" (nötr) gösterilir. */
export default function CarDamageDiagram({ partsStatus }) {
  const statusByPart = Object.fromEntries((partsStatus ?? []).map((row) => [row.part, row.status]));

  return (
    <div className="car-diagram">
      <div className="car-diagram__grid">
        {LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="car-diagram__row">
            {row.map((part, colIndex) =>
              part === null ? (
                <div key={colIndex} className="car-diagram__cell car-diagram__cell--spacer" />
              ) : (
                <div
                  key={colIndex}
                  title={`${part}: ${statusByPart[part] ?? "Bilgi girilmedi"}`}
                  className={`car-diagram__cell ${STATUS_CLASS[statusByPart[part]] ?? "car-diagram__cell--unknown"}`}
                >
                  <span className="car-diagram__cell-label">{part}</span>
                </div>
              ),
            )}
          </div>
        ))}
      </div>

      <div className="car-diagram__legend">
        {LEGEND.map(({ status, label }) => (
          <span key={status} className="car-diagram__legend-item">
            <span className={`car-diagram__legend-dot ${STATUS_CLASS[status]}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
