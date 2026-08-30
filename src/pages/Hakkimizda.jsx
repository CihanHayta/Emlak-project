import { ShieldCheck, Eye, Users, Smile } from "lucide-react";
import PageBanner from "../components/common/PageBanner";
import { WhatsAppIcon } from "../components/common/BrandIcons";
import { SITE, buildWhatsAppLink } from "../config/siteConfig";
import { HERO_STATS } from "../data/stats";
import "./Hakkimizda.css";

// "Why choose us" values shown as a 4-item feature grid below the story
// section. Placeholder copy — rewrite to reflect the agency's real story.
const VALUES = [
  { Icon: ShieldCheck, title: "Güvenilirlik", text: "Her işlemde dürüst ve şeffaf bir yaklaşım benimsiyoruz." },
  { Icon: Eye, title: "Şeffaflık", text: "Süreç boyunca sizi her adımda bilgilendiriyoruz." },
  { Icon: Users, title: "Uzman Kadro", text: "Alanında deneyimli danışmanlarla çalışıyoruz." },
  { Icon: Smile, title: "Müşteri Memnuniyeti", text: "Amacımız, alım-satım sonrası da yanınızda olmak." },
];

/**
 * "/hakkimizda" — About Us page.
 *
 * PLACEHOLDER CONTENT: the story text, values and photo below are generic
 * sample copy so the page doesn't look empty. The agency owner should
 * rewrite them with the real founding story / team info.
 */
export default function Hakkimizda() {
  return (
    <>
      <PageBanner
        title="Hakkımızda"
        subtitle={`${SITE.name}'ın hikayesi, değerleri ve çalışma prensipleri.`}
      />

      {/* Story section: text + photo */}
      <section className="about-story">
        <div>
          <h2 className="about-story__title">Bizi Farklı Kılan Nedir?</h2>
          <p className="about-story__text">
            {SITE.name} olarak, bölgemizde yıllardır gayrimenkul alım, satım ve
            kiralama süreçlerinde müşterilerimize güvenilir ve şeffaf bir
            hizmet sunuyoruz. Her müşterimizin ihtiyacını dikkatle dinleyip,
            ona en uygun evi bulmak için titizlikle çalışıyoruz.
          </p>
          <p className="about-story__text">
            Ücretsiz ekspertizden kredi danışmanlığına, tapu takibinden
            satış sonrası desteğe kadar tüm süreçte yanınızdayız. Amacımız
            sadece bir ilan yayınlamak değil, sizin için doğru kararı
            vermenize yardımcı olmaktır.
          </p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=75"
          alt="Şahin Emlak ofisi"
          className="about-story__image"
          loading="lazy"
        />
      </section>

      {/* Trust stats, reused from the homepage hero data */}
      <section className="about-stats">
        <div className="about-stats__grid">
          {HERO_STATS.map((stat) => (
            <div key={stat.id} className="about-stats__item">
              <p className="about-stats__value">{stat.value}</p>
              <p className="about-stats__label">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values / why-choose-us grid */}
      <section className="about-values">
        <h2 className="about-values__heading">Neden {SITE.name}?</h2>
        <div className="about-values__grid">
          {VALUES.map(({ Icon, title, text }) => (
            <div key={title} className="about-values__card">
              <span className="about-values__icon">
                <Icon className="icon-6" />
              </span>
              <h3 className="about-values__title">{title}</h3>
              <p className="about-values__text">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="about-cta">
        <h2 className="about-cta__title">Bizimle Çalışmak İster misiniz?</h2>
        <p className="about-cta__text">
          Sorularınız için hemen WhatsApp üzerinden bize ulaşabilirsiniz.
        </p>
        <a
          href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
          target="_blank"
          rel="noopener noreferrer"
          className="about-cta__button"
        >
          <WhatsAppIcon className="icon-5" />
          İletişime Geç
        </a>
      </section>
    </>
  );
}
