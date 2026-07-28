import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";

/**
 * A listing's cover photo, resolved whether it's a plain URL (public
 * site's sample listings) or an "idb:" reference to an uploaded file
 * (see lib/mediaStore.js). Used anywhere a small listing thumbnail shows
 * up outside of the full PropertyGallery (İlanlar table, Randevu detail panel).
 */
export default function ListingThumbnail({ src, alt, className }) {
  const url = useResolvedMediaUrl(src);
  return <img src={url ?? ""} alt={alt} className={className} />;
}
