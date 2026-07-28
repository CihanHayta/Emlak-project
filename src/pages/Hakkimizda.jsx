import { ShieldCheck, Eye, Users, Smile } from "lucide-react";
import PageBanner from "../components/common/PageBanner";
import { WhatsAppIcon } from "../components/common/BrandIcons";
import { SITE, buildWhatsAppLink } from "../config/siteConfig";
import { HERO_STATS } from "../data/stats";

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
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold text-brand-navy">Bizi Farklı Kılan Nedir?</h2>
          <p className="mb-4 text-gray-600">
            {SITE.name} olarak, bölgemizde yıllardır gayrimenkul alım, satım ve
            kiralama süreçlerinde müşterilerimize güvenilir ve şeffaf bir
            hizmet sunuyoruz. Her müşterimizin ihtiyacını dikkatle dinleyip,
            ona en uygun evi bulmak için titizlikle çalışıyoruz.
          </p>
          <p className="text-gray-600">
            Ücretsiz ekspertizden kredi danışmanlığına, tapu takibinden
            satış sonrası desteğe kadar tüm süreçte yanınızdayız. Amacımız
            sadece bir ilan yayınlamak değil, sizin için doğru kararı
            vermenize yardımcı olmaktır.
          </p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=75"
          alt="Şahin Emlak ofisi"
          className="aspect-4/3 w-full rounded-2xl object-cover shadow-md"
        />
      </section>

      {/* Trust stats, reused from the homepage hero data */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
          {HERO_STATS.map((stat) => (
            <div key={stat.id} className="text-center">
              <p className="text-3xl font-extrabold text-brand-gold-dark">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values / why-choose-us grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-brand-navy">
          Neden {SITE.name}?
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mb-1 font-bold text-brand-navy">{title}</h3>
              <p className="text-sm text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-brand-navy px-6 py-14 text-center">
        <h2 className="mb-3 text-2xl font-bold text-white">Bizimle Çalışmak İster misiniz?</h2>
        <p className="mb-6 text-gray-300">
          Sorularınız için hemen WhatsApp üzerinden bize ulaşabilirsiniz.
        </p>
        <a
          href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-6 py-3 font-semibold text-white transition hover:bg-brand-gold-dark"
        >
          <WhatsAppIcon className="h-5 w-5" />
          İletişime Geç
        </a>
      </section>
    </>
  );
}
