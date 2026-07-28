import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";

/**
 * Media gallery for the listing detail page: a swipeable/slidable carousel
 * that starts with the video tour (autoplaying, muted) if the listing has
 * one, followed by its photos. Kept at a fixed, moderate height (not a huge
 * edge-to-edge hero) so the video and photos both stay a reasonable size
 * next to the "Benzer İlanlar" sidebar.
 *
 * Each image/video source is resolved via useResolvedMediaUrl, since an
 * admin-created listing's photos/videos are "idb:" references to files
 * uploaded straight into IndexedDB (see lib/mediaStore.js) rather than
 * plain URLs like the sample listings.
 */
export default function PropertyGallery({ property }) {
  const images = property.images?.length ? property.images : [property.image];
  const posterUrl = useResolvedMediaUrl(property.image);
  const videoSrc = useResolvedMediaUrl(property.videoUrl);

  return (
    <div className="relative">
      <Swiper
        modules={[Navigation, Pagination]}
        navigation={{ prevEl: "#gallery-prev", nextEl: "#gallery-next" }}
        pagination={{ clickable: true }}
        className="h-72 w-full overflow-hidden rounded-2xl bg-gray-100 shadow-md sm:h-96"
      >
        {property.hasVideo && (
          <SwiperSlide>
            <video
              key={property.id}
              className="h-full w-full object-cover"
              poster={posterUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          </SwiperSlide>
        )}
        {images.map((src, index) => (
          <SwiperSlide key={src + index}>
            <GalleryImage src={src} alt={`${property.title} - ${index + 1}`} />
          </SwiperSlide>
        ))}
      </Swiper>

      <button
        id="gallery-prev"
        type="button"
        aria-label="Önceki görsel"
        className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow-md transition hover:bg-white"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        id="gallery-next"
        type="button"
        aria-label="Sonraki görsel"
        className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow-md transition hover:bg-white"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function GalleryImage({ src, alt }) {
  const url = useResolvedMediaUrl(src);
  return <img src={url ?? ""} alt={alt} className="h-full w-full object-cover" />;
}
