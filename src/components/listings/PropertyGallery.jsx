import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
import "./PropertyGallery.css";

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
    <div className="property-gallery">
      <Swiper
        modules={[Navigation, Pagination]}
        navigation={{ prevEl: "#gallery-prev", nextEl: "#gallery-next" }}
        pagination={{ clickable: true }}
      >
        {property.hasVideo && (
          <SwiperSlide>
            <video
              key={property.id}
              className="property-gallery__media"
              poster={posterUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={(event) => event.preventDefault()}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          </SwiperSlide>
        )}
        {images.map((src, index) => (
          <SwiperSlide key={src + index}>
            {/* Video varsa o zaten ilk slayt, en görünür medya onun posteri —
                galerideki hiçbir görsel LCP adayı değil, hepsi lazy olabilir.
                Video yoksa ilk görsel gerçekten ilk görünen şey, o eager kalmalı. */}
            <GalleryImage src={src} alt={`${property.title} - ${index + 1}`} isFirst={!property.hasVideo && index === 0} />
          </SwiperSlide>
        ))}
      </Swiper>

      <button id="gallery-prev" type="button" aria-label="Önceki görsel" className="property-gallery__nav-btn property-gallery__nav-btn--prev">
        <ChevronLeft className="icon-5" />
      </button>
      <button id="gallery-next" type="button" aria-label="Sonraki görsel" className="property-gallery__nav-btn property-gallery__nav-btn--next">
        <ChevronRight className="icon-5" />
      </button>
    </div>
  );
}

function GalleryImage({ src, alt, isFirst }) {
  const url = useResolvedMediaUrl(src);
  return (
    <img
      src={url ?? ""}
      alt={alt}
      className="property-gallery__media"
      loading={isFirst ? "eager" : "lazy"}
      fetchPriority={isFirst ? "high" : undefined}
    />
  );
}
