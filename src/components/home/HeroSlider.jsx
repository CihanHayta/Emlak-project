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
import "./HeroSlider.css";

/**
 * The full-width, auto-sliding hero banner at the top of the homepage.
 * Built with Swiper so it auto-advances between slides and can also be
 * dragged/swiped or navigated with the arrow buttons / pagination dots,
 * matching the reference design.
 */
export default function HeroSlider() {
  return (
    <section className="hero-slider">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        loop
        navigation={{ prevEl: "#hero-prev", nextEl: "#hero-next" }}
        pagination={{ clickable: true }}
      >
        {HERO_SLIDES.map((slide) => (
          <SwiperSlide key={slide.id}>
            <HeroSlideContent slide={slide} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom circular prev/next buttons (Swiper targets them via the ids above) */}
      <button id="hero-prev" type="button" aria-label="Önceki" className="hero-slider__nav-btn hero-slider__nav-btn--prev">
        <ChevronLeft className="icon-6" />
      </button>
      <button id="hero-next" type="button" aria-label="Sonraki" className="hero-slider__nav-btn hero-slider__nav-btn--next">
        <ChevronRight className="icon-6" />
      </button>
    </section>
  );
}

/** One hero slide: background photo + gradient overlay + headline + CTAs. */
function HeroSlideContent({ slide }) {
  return (
    <div className="hero-slide">
      <img src={slide.image} alt="" className="hero-slide__image" />
      {/* Dark gradient so the white text stays readable over any photo */}
      <div className="hero-slide__gradient" />

      <div className="hero-slide__content">
        <div className="hero-slide__text">
          <p className="hero-slide__eyebrow">{slide.eyebrow}</p>
          <h1 className="hero-slide__title">
            {slide.highlight}
            <br />
            <span className="hero-slide__title-suffix">{slide.titleSuffix}</span>
          </h1>
          <p className="hero-slide__description">{slide.description}</p>

          <div className="hero-slide__ctas">
            <a
              href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-slide__cta hero-slide__cta--primary"
            >
              <WhatsAppIcon className="icon-5" />
              İletişime Geç
            </a>
            <Link to="/satilik" className="hero-slide__cta hero-slide__cta--secondary">
              İlanları İncele
              <ChevronRight className="icon-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Trust stats overlaid on the bottom of the hero, like the reference design */}
      <div className="hero-slide__stats-wrap">
        <StatsBar />
      </div>
    </div>
  );
}
