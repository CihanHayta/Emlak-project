import { useState } from "react";
import { Play } from "lucide-react";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
import "./VehicleGallery.css";

/**
 * Ekran görüntüsündeki gibi: solda büyük bir ana görsel, sağda küçük resim
 * grid'i (tıklayınca ana görseli değiştirir) — PropertyGallery'nin (Swiper
 * carousel) aksine statik bir grid. Video varsa grid'in ilk hücresi video
 * olur, seçilince ana alanda oynatılır.
 */
export default function VehicleGallery({ vehicle }) {
  const items = [
    ...(vehicle.hasVideo && vehicle.videoUrl ? [{ type: "video", src: vehicle.videoUrl }] : []),
    ...(vehicle.images?.length ? vehicle.images : vehicle.image ? [vehicle.image] : []).map((src) => ({ type: "image", src })),
  ];
  const [selected, setSelected] = useState(0);
  const activeItem = items[selected] ?? items[0];

  const MAX_THUMBS = 8;
  const visibleThumbs = items.slice(0, MAX_THUMBS);
  const extraCount = items.length - MAX_THUMBS;

  if (items.length === 0) {
    return <div className="vehicle-gallery vehicle-gallery--empty" />;
  }

  return (
    <div className="vehicle-gallery">
      <div className="vehicle-gallery__main">
        <MainMedia item={activeItem} title={vehicle.title} />
      </div>

      {items.length > 1 && (
        <div className="vehicle-gallery__thumbs">
          {visibleThumbs.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              className={`vehicle-gallery__thumb${index === selected ? " vehicle-gallery__thumb--active" : ""}`}
            >
              <ThumbMedia item={item} title={vehicle.title} />
              {item.type === "video" && (
                <span className="vehicle-gallery__thumb-play">
                  <Play className="icon-4" />
                </span>
              )}
              {index === MAX_THUMBS - 1 && extraCount > 0 && (
                <span className="vehicle-gallery__thumb-more">+{extraCount}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {items.length > 1 && (
        <p className="vehicle-gallery__counter">{selected + 1} / {items.length}</p>
      )}
    </div>
  );
}

function MainMedia({ item, title }) {
  const url = useResolvedMediaUrl(item?.src);
  if (item?.type === "video") {
    return (
      <video
        key={item.src}
        className="vehicle-gallery__media"
        src={url}
        controls
        autoPlay
        muted
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(event) => event.preventDefault()}
      />
    );
  }
  return <img src={url ?? ""} alt={title} className="vehicle-gallery__media" />;
}

function ThumbMedia({ item, title }) {
  const url = useResolvedMediaUrl(item.type === "video" ? null : item.src);
  if (item.type === "video") {
    return <div className="vehicle-gallery__thumb-video-placeholder" />;
  }
  return <img src={url ?? ""} alt={title} className="vehicle-gallery__thumb-image" loading="lazy" />;
}
