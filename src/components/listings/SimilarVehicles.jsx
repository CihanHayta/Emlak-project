import { Link } from "react-router-dom";
import { getSimilarVehicles } from "../../data/vehicles";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
// SimilarListings.css'i BİLEREK aynen kullanıyoruz — bkz. VehicleCard.jsx'in
// PropertyCard.css'i aynı sebeple paylaşmasındaki yorum.
import "./SimilarListings.css";

/** SimilarListings.jsx ile aynı desen — bkz. o dosyanın yorumu. */
export default function SimilarVehicles({ vehicle }) {
  const similar = getSimilarVehicles(vehicle);

  if (similar.length === 0) return null;

  return (
    <aside>
      <h2 className="similar-listings__heading">Benzer Araçlar</h2>
      <div className="similar-listings__list">
        {similar.map((item) => (
          <Link key={item.id} to={`/arac/${item.id}`} className="similar-listings__item">
            <SimilarVehicleThumb src={item.image} alt={item.title} />
            <div className="similar-listings__info">
              <h3 className="similar-listings__title">{item.title}</h3>
              <p className="similar-listings__location">
                {item.brand} {item.model} · {item.year}
              </p>
              <p className="similar-listings__price">{item.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function SimilarVehicleThumb({ src, alt }) {
  const url = useResolvedMediaUrl(src);
  return <img src={url ?? ""} alt={alt} loading="lazy" className="similar-listings__thumb" />;
}
