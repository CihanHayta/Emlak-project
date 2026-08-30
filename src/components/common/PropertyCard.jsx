import { Link } from "react-router-dom";
import { Play, Tag } from "lucide-react";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
import "./PropertyCard.css";

/**
 * A single property card: photo + title + location + specs (rooms/area/floor)
 * + İlan No + price. The whole card links to that listing's detail page
 * ("/ilan/:id").
 *
 * Reused in two contexts:
 *  - Homepage video rows (VideoShowcase): pass a `property` that has
 *    `hasVideo: true`, which adds the center play-button overlay and the
 *    duration badge. The actual video only plays on the detail page — here
 *    it's just a visual affordance hinting that a video tour exists.
 *  - Satılık / Kiralık listing pages: same card, just without the video
 *    overlay, since those properties don't set `hasVideo`.
 */
export default function PropertyCard({ property }) {
  const {
    id, title, district, neighborhood, type, rooms, area, floor, zoningStatus,
    price, image, hasVideo, videoDuration, listingNo,
  } = property;
  const location = neighborhood ? `${neighborhood}, ${district}` : district;
  const isArsa = type === "Arsa";
  // `image` is either a plain URL (sample listings) or an "idb:" reference
  // to a file the admin panel uploaded — this resolves either transparently.
  const resolvedImage = useResolvedMediaUrl(image);

  return (
    <Link to={`/ilan/${id}`} className="property-card">
      <div className="property-card__media">
        <img src={resolvedImage ?? ""} alt={title} loading="lazy" className="property-card__image" />

        {hasVideo && (
          <>
            {/* Center "play" affordance — the real video plays on the detail page. */}
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
        <p className="property-card__location">{location}</p>
        <p className="property-card__specs">
          {isArsa ? (
            <>{area} m² &nbsp;•&nbsp; {zoningStatus}</>
          ) : (
            <>{rooms} &nbsp;•&nbsp; {area} m² &nbsp;•&nbsp; {floor}</>
          )}
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
