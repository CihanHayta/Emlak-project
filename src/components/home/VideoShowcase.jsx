import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import PropertyCard from "../common/PropertyCard";

/**
 * A horizontally-scrolling row of property "video tour" cards, used several
 * times on the homepage (Satılık Evler, Satılık Arsalar, Kiralık İlanlar,
 * Kiralık Arsalar). Everything (title, "see all" link, the listings
 * themselves) is passed in as props so this one component drives every row.
 */
export default function VideoShowcase({ title, seeAllHref, properties }) {
  // Unique DOM ids so multiple instances of this component on the homepage
  // don't fight over the same nav button ids. Derived from `title` (not
  // `seeAllHref`) since two rows can share the same "see all" link — e.g.
  // both "Satılık Evler" and "Satılık Arsalar" link to /satilik.
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");
  const prevId = `video-${slug}-prev`;
  const nextId = `video-${slug}-next`;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-brand-navy">
          <PlayCircle className="h-6 w-6 text-brand-gold" />
          {title}
        </h2>
        <Link
          to={seeAllHref}
          className="flex items-center gap-1 text-sm font-medium text-brand-gold-dark hover:underline"
        >
          Tüm videoları izle
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation]}
          navigation={{ prevEl: `#${prevId}`, nextEl: `#${nextId}` }}
          spaceBetween={20}
          slidesPerView={1.15}
          breakpoints={{
            640: { slidesPerView: 2.2 },
            1024: { slidesPerView: 4 },
          }}
        >
          {properties.map((property) => (
            <SwiperSlide key={property.id} className="h-auto pb-1">
              <PropertyCard property={property} />
            </SwiperSlide>
          ))}
        </Swiper>

        <button
          id={prevId}
          type="button"
          aria-label="Önceki"
          className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-navy shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 lg:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          id={nextId}
          type="button"
          aria-label="Sonraki"
          className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-navy shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 lg:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
