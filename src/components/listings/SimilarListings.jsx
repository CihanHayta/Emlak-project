import { Link } from "react-router-dom";
import { getSimilarProperties } from "../../data/properties";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
import "./SimilarListings.css";

/**
 * "Benzer İlanlar" sidebar shown next to a listing's details on the detail
 * page — same category (satılık/kiralık), same district first. Compact
 * cards (not the full PropertyCard) since this is a secondary sidebar list,
 * not the main content.
 */
export default function SimilarListings({ property }) {
  const similar = getSimilarProperties(property);

  if (similar.length === 0) return null;

  return (
    <aside>
      <h2 className="similar-listings__heading">Benzer İlanlar</h2>
      <div className="similar-listings__list">
        {similar.map((item) => (
          <Link key={item.id} to={`/ilan/${item.id}`} className="similar-listings__item">
            <SimilarListingThumb src={item.image} alt={item.title} />
            <div className="similar-listings__info">
              <h3 className="similar-listings__title">{item.title}</h3>
              <p className="similar-listings__location">
                {item.neighborhood}, {item.district}
              </p>
              <p className="similar-listings__price">{item.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function SimilarListingThumb({ src, alt }) {
  const url = useResolvedMediaUrl(src);
  return <img src={url ?? ""} alt={alt} loading="lazy" className="similar-listings__thumb" />;
}
