import { Link } from "react-router-dom";
import { Home as HomeIcon, Phone, Mail, MapPin, ShieldCheck } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon, LinkedinIcon } from "../common/BrandIcons";
import { NAV_LINKS } from "../../config/navigation";
import { SITE } from "../../config/siteConfig";
import { PROPERTIES } from "../../data/properties";

// Footer-specific service list. Deliberately separate from data/services.js
// because the footer shows "Gayrimenkul Danışmanlığı" instead of "7/24
// Destek" here — the two lists just happen to mostly overlap.
const FOOTER_SERVICES = [
  "Ücretsiz Ekspertiz",
  "Kredi Danışmanlığı",
  "Tapu Takip Süreci",
  "Gayrimenkul Danışmanlığı",
];

const SOCIAL_LINKS = [
  { key: "facebook", Icon: FacebookIcon, label: "Facebook" },
  { key: "instagram", Icon: InstagramIcon, label: "Instagram" },
  { key: "youtube", Icon: YoutubeIcon, label: "YouTube" },
  { key: "linkedin", Icon: LinkedinIcon, label: "LinkedIn" },
];

// A handful of listing photos reused as a small "follow us" preview grid —
// purely decorative, swap for real Instagram feed photos later if wanted.
const FOLLOW_PREVIEW_IMAGES = PROPERTIES.slice(0, 4);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-navy text-gray-300">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        {/* Brand column */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-brand-gold text-brand-gold">
              <HomeIcon className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-wide text-white">
              {SITE.shortName}
            </span>
          </div>
          <p className="mb-4 text-sm text-gray-400">
            {SITE.name}, hayalinizdeki eve ulaşmanız için profesyonel çözümler sunar.
          </p>
          <div className="flex gap-3">
            {SOCIAL_LINKS.map(({ key, Icon, label }) => (
              <a
                key={key}
                href={SITE.social[key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-gray-300 transition hover:bg-brand-gold hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Quick links column */}
        <div>
          <h4 className="mb-4 font-bold text-white">Hızlı Linkler</h4>
          <ul className="space-y-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition hover:text-brand-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services column */}
        <div>
          <h4 className="mb-4 font-bold text-white">Hizmetlerimiz</h4>
          <ul className="space-y-2.5 text-sm">
            {FOOTER_SERVICES.map((service) => (
              <li key={service}>
                <Link to="/hizmetlerimiz" className="transition hover:text-brand-gold">
                  {service}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact column */}
        <div>
          <h4 className="mb-4 font-bold text-white">İletişim</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
              <a href={SITE.phoneHref} className="transition hover:text-brand-gold">
                {SITE.phoneDisplay}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
              <a href={`mailto:${SITE.email}`} className="transition hover:text-brand-gold">
                {SITE.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
              <span>{SITE.address}</span>
            </li>
          </ul>
        </div>

        {/* "Follow us" preview grid column */}
        <div>
          <h4 className="mb-4 font-bold text-white">Bizi Takip Edin</h4>
          <div className="grid grid-cols-2 gap-2">
            {FOLLOW_PREVIEW_IMAGES.map((property) => (
              <a
                key={property.id}
                href={SITE.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-lg"
              >
                <img
                  src={property.image}
                  alt={property.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition hover:scale-110"
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-sm text-gray-400 sm:flex-row">
          <p>
            © {currentYear} {SITE.name}. Tüm hakları saklıdır.
          </p>
          {/* TODO(owner): link these to real legal pages once they're written. */}
          <div className="flex items-center gap-5">
            <a href="#" className="transition hover:text-brand-gold">KVKK</a>
            <a href="#" className="transition hover:text-brand-gold">Gizlilik Politikası</a>
            <a href="#" className="transition hover:text-brand-gold">Çerez Politikası</a>
            <Link
              to="/admin"
              title="Yönetici Girişi"
              aria-label="Yönetici Girişi"
              className="flex items-center gap-1.5 transition hover:text-brand-gold"
            >
              <ShieldCheck className="h-4 w-4" />
              Yönetici Girişi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
