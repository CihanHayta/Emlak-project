import { Link } from "react-router-dom";
import { Play, Tag } from "lucide-react";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
// PropertyCard.css'i BİLEREK aynen kullanıyoruz — kart görünümü (medya +
// başlık + alt satır + özellikler + fiyat) tamamen aynı, sadece hangi
// alanların gösterildiği farklı. Ayrı bir CSS dosyası yazmaya değmez.
import "./PropertyCard.css";

const STATUS_LABELS = { sold: "Satıldı", reserved: "Rezerve" };

/** PropertyCard.jsx ile aynı desen — bkz. o dosyanın yorumu. */
export default function VehicleCard({ vehicle }) {
  const { id, title, brand, model, year, km, fuelType, transmission, price, image, hasVideo, videoDuration, listingNo, status } = vehicle;
  const resolvedImage = useResolvedMediaUrl(image);
  const statusLabel = STATUS_LABELS[status];

  return (
    <Link to={`/arac/${id}`} className="property-card">
      <div className="property-card__media">
        <img src={resolvedImage ?? ""} alt={title} loading="lazy" className="property-card__image" />

        {statusLabel && (
          <span className={`vehicle-card__status vehicle-card__status--${status}`}>{statusLabel}</span>
        )}

        {hasVideo && (
          <>
            <div className="property-card__play-overlay">
              <span className="property-card__play-btn">
                <Play className="property-card__play-icon" />
              </span>
            </div>
            {videoDuration && <span className="property-card__duration">{videoDuration}</span>}
          </>
        )}
      </div>

      <div className="property-card__body">
        <h3 className="property-card__title">{title}</h3>
        <p className="property-card__location">{brand} {model} · {year}</p>
        <p className="property-card__specs">
          {Number(km).toLocaleString("tr-TR")} km &nbsp;•&nbsp; {fuelType} &nbsp;•&nbsp; {transmission}
        </p>
        <p className="property-card__listing-no">
          <Tag className="property-card__listing-no-icon" />
          İlan No: {listingNo}
        </p>
        <p className="property-card__price">{price}</p>
      </div>
    </Link>
  );
}
