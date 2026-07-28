import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { HERO_SLIDES } from "../../data/heroSlides";
import { WhatsAppIcon } from "../common/BrandIcons";
import { buildWhatsAppLink } from "../../config/siteConfig";
import StatsBar from "./StatsBar";

/**
 * The full-width, auto-sliding hero banner at the top of the homepage.
 * Built with Swiper so it auto-advances between slides and can also be
 * dragged/swiped or navigated with the arrow buttons / pagination dots,
 * matching the reference design.
 */
export default function HeroSlider() {
  return (
    <section className="relative">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        loop
        navigation={{ prevEl: "#hero-prev", nextEl: "#hero-next" }}
        pagination={{ clickable: true }}
        className="h-110 w-full sm:h-120"
      >
        {HERO_SLIDES.map((slide) => (
          <SwiperSlide key={slide.id}>
            <HeroSlideContent slide={slide} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom circular prev/next buttons (Swiper targets them via the ids above) */}
      <button
        id="hero-prev"
        type="button"
        aria-label="Önceki"
        className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        id="hero-next"
        type="button"
        aria-label="Sonraki"
        className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:flex"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </section>
  );
}

/** One hero slide: background photo + gradient overlay + headline + CTAs. */
function HeroSlideContent({ slide }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-brand-navy">
      <img
        src={slide.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark gradient so the white text stays readable over any photo */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />

      <div className="relative mx-auto w-full max-w-7xl px-6 pb-14 pt-8">
        <div className="max-w-2xl">
          <p className="mb-2 text-base text-gray-200">{slide.eyebrow}</p>
          <h1 className="mb-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            {slide.highlight}
            <br />
            <span className="text-brand-gold">{slide.titleSuffix}</span>
          </h1>
          <p className="mb-5 max-w-lg text-gray-200">{slide.description}</p>

          <div className="flex flex-wrap gap-4">
            <a
              href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-brand-gold px-6 py-3 font-semibold text-white transition hover:bg-brand-gold-dark"
            >
              <WhatsAppIcon className="h-5 w-5" />
              İletişime Geç
            </a>
            <Link
              to="/satilik"
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-navy transition hover:bg-gray-100"
            >
              İlanları İncele
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Trust stats overlaid on the bottom of the hero, like the reference design */}
      <div className="relative mx-auto w-full max-w-7xl px-6">
        <StatsBar />
      </div>
    </div>
  );
}
