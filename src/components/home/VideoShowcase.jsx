import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import PropertyCard from "../common/PropertyCard";
import "./VideoShowcase.css";

/**
 * A horizontally-scrolling row of cards, used several times on the homepage
 * (Satılık Evler, Satılık Arsalar, Kiralık İlanlar, Kiralık Arsalar — video
 * tours — ve Satılık Araçlar). Everything (title, "see all" link, the
 * items themselves, which card component renders each one) is passed in as
 * props so this one component drives every row instead of each row
 * duplicating the same Swiper carousel markup.
 */
export default function VideoShowcase({ title, seeAllHref, properties, CardComponent = PropertyCard, icon: Icon = PlayCircle }) {
  // Unique DOM ids so multiple instances of this component on the homepage
  // don't fight over the same nav button ids. Derived from `title` (not
  // `seeAllHref`) since two rows can share the same "see all" link — e.g.
  // both "Satılık Evler" and "Satılık Arsalar" link to /satilik.
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");
  const prevId = `video-${slug}-prev`;
  const nextId = `video-${slug}-next`;

  return (
    <section className="video-showcase">
      <div className="video-showcase__header">
        <h2 className="video-showcase__title">
          <Icon className="video-showcase__title-icon" />
          {title}
        </h2>
        <Link to={seeAllHref} className="video-showcase__see-all">
          Tüm İlanları İncele
          <ChevronRight className="icon-4" />
        </Link>
      </div>

      <div className="video-showcase__carousel">
        <Swiper
          modules={[Navigation]}
          navigation={{ prevEl: `#${prevId}`, nextEl: `#${nextId}` }}
          spaceBetween={14}
          slidesPerView={1.35}
          breakpoints={{
            640: { slidesPerView: 2.2, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
          }}
        >
          {properties.map((property) => (
            <SwiperSlide key={property.id} className="video-showcase__slide">
              {/* PropertyCard/VehicleCard prop adları farklı (property/vehicle) —
                  ikisini birden geçmek, ikisini de değiştirmeden bu satırın
                  hangi CardComponent'i aldığından bağımsız çalışmasını sağlıyor
                  (kullanılmayan prop React'te sessizce yok sayılır). */}
              <CardComponent property={property} vehicle={property} />
            </SwiperSlide>
          ))}
        </Swiper>

        <button id={prevId} type="button" aria-label="Önceki" className="video-showcase__nav-btn video-showcase__nav-btn--prev">
          <ChevronLeft className="icon-5" />
        </button>
        <button id={nextId} type="button" aria-label="Sonraki" className="video-showcase__nav-btn video-showcase__nav-btn--next">
          <ChevronRight className="icon-5" />
        </button>
      </div>
    </section>
  );
}
