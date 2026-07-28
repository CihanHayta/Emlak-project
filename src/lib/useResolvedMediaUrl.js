import { useEffect, useState } from "react";
import { isMediaRef, fromMediaRef, getMediaBlob } from "./mediaStore";

/**
 * Turns a listing's stored image/video reference into something an
 * `<img>`/`<video>` can actually load: a plain URL passes straight
 * through (the public site's Unsplash sample listings), while an
 * "idb:<uuid>" reference is resolved by pulling the Blob out of IndexedDB
 * and wrapping it in a fresh object URL — freshly, every mount, since
 * object URLs from a previous page load are no longer valid.
 *
 * Used by both the admin panel (editing a listing) and the public site
 * (displaying an admin-created listing's actual uploaded photos/videos).
 */
export function useResolvedMediaUrl(ref) {
  const [url, setUrl] = useState(() => (isMediaRef(ref) ? null : ref ?? null));

  useEffect(() => {
    if (!isMediaRef(ref)) {
      setUrl(ref ?? null);
      return;
    }

    let objectUrl;
    let cancelled = false;

    getMediaBlob(fromMediaRef(ref)).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ref]);

  return url;
}
