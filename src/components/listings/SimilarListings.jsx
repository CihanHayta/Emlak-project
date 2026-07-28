import { Link } from "react-router-dom";
import { getSimilarProperties } from "../../data/properties";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";

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
      <h2 className="mb-4 text-lg font-bold text-brand-navy">Benzer İlanlar</h2>
      <div className="flex flex-col gap-4">
        {similar.map((item) => (
          <Link
            key={item.id}
            to={`/ilan/${item.id}`}
            className="group flex gap-3 rounded-xl border border-gray-100 p-2.5 shadow-sm transition hover:shadow-md"
          >
            <SimilarListingThumb src={item.image} alt={item.title} />
            <div className="min-w-0 py-0.5">
              <h3 className="truncate text-sm font-bold text-brand-navy">{item.title}</h3>
              <p className="truncate text-xs text-gray-500">
                {item.neighborhood}, {item.district}
              </p>
              <p className="mt-1 text-sm font-bold text-brand-gold-dark">{item.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function SimilarListingThumb({ src, alt }) {
  const url = useResolvedMediaUrl(src);
  return (
    <img
      src={url ?? ""}
      alt={alt}
      loading="lazy"
      className="h-20 w-24 shrink-0 rounded-lg object-cover transition duration-300 group-hover:scale-105"
    />
  );
}
