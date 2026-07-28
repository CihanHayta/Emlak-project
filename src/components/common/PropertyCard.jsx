import { Link } from "react-router-dom";
import { Play, Tag } from "lucide-react";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";

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
    <Link
      to={`/ilan/${id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-lg"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
        <img
          src={resolvedImage ?? ""}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

        {hasVideo && (
          <>
            {/* Center "play" affordance — the real video plays on the detail page. */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md transition group-hover:scale-110">
                <Play className="ml-1 h-6 w-6 fill-brand-navy text-brand-navy" />
              </span>
            </div>
            {videoDuration && (
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                {videoDuration}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 truncate font-bold text-brand-navy">{title}</h3>
        <p className="mb-2 text-sm text-gray-500">{location}</p>
        <p className="mb-1 text-sm text-gray-600">
          {isArsa ? (
            <>{area} m² &nbsp;•&nbsp; {zoningStatus}</>
          ) : (
            <>{rooms} &nbsp;•&nbsp; {area} m² &nbsp;•&nbsp; {floor}</>
          )}
        </p>
        <p className="mb-3 flex items-center gap-1 text-xs text-gray-400">
          <Tag className="h-3 w-3" />
          İlan No: {listingNo}
        </p>
        <p className="mt-auto text-lg font-bold text-brand-gold-dark">{price}</p>
      </div>
    </Link>
  );
}
