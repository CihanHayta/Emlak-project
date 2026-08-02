import { Link } from "react-router-dom";
import { Home as HomeIcon, Phone, Mail, MapPin, ShieldCheck } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon, LinkedinIcon } from "../common/BrandIcons";
import { NAV_LINKS } from "../../config/navigation";
import { SITE } from "../../config/siteConfig";
import { getAllProperties } from "../../data/properties";
import { usePropertiesVersion } from "../../hooks/usePropertiesVersion";
import "./Footer.css";

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

export default function Footer() {
  const currentYear = new Date().getFullYear();
  usePropertiesVersion(); // re-render once the async listings fetch resolves
  // A handful of listing photos reused as a small "follow us" preview grid —
  // purely decorative, swap for real Instagram feed photos later if wanted.
  const followPreviewImages = getAllProperties().slice(0, 4);

  return (
    <footer className="footer">
      <div className="footer__grid">
        {/* Brand column */}
        <div className="footer__brand-col">
          <div className="footer__brand-header">
            <span className="footer__brand-icon">
              <HomeIcon className="icon-5" />
            </span>
            <span className="footer__brand-name">{SITE.shortName}</span>
          </div>
          <p className="footer__brand-desc">
            {SITE.name}, hayalinizdeki eve ulaşmanız için profesyonel çözümler sunar.
          </p>
          <div className="footer__social-row">
            {SOCIAL_LINKS.map(({ key, Icon, label }) => (
              <a
                key={key}
                href={SITE.social[key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="footer__social-link"
              >
                <Icon className="icon-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Quick links column */}
        <div>
          <h4 className="footer__heading">Hızlı Linkler</h4>
          <ul className="footer__list">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services column */}
        <div>
          <h4 className="footer__heading">Hizmetlerimiz</h4>
          <ul className="footer__list">
            {FOOTER_SERVICES.map((service) => (
              <li key={service}>
                <Link to="/hizmetlerimiz">{service}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact column */}
        <div>
          <h4 className="footer__heading">İletişim</h4>
          <ul className="footer__list footer__list--contact">
            <li className="footer__contact-item">
              <Phone className="footer__contact-icon" />
              <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a>
            </li>
            <li className="footer__contact-item">
              <Mail className="footer__contact-icon" />
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </li>
            <li className="footer__contact-item">
              <MapPin className="footer__contact-icon" />
              <span>{SITE.address}</span>
            </li>
          </ul>
        </div>

        {/* "Follow us" preview grid column */}
        <div>
          <h4 className="footer__heading">Bizi Takip Edin</h4>
          <div className="footer__follow-grid">
            {followPreviewImages.map((property) => (
              <a
                key={property.id}
                href={SITE.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__follow-item"
              >
                <img src={property.image} alt={property.title} loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <p>
            © {currentYear} {SITE.name}. Tüm hakları saklıdır.
          </p>
          {/* TODO(owner): link these to real legal pages once they're written. */}
          <div className="footer__bottom-links">
            <a href="#">KVKK</a>
            <a href="#">Gizlilik Politikası</a>
            <a href="#">Çerez Politikası</a>
            <Link to="/admin" title="Yönetici Girişi" aria-label="Yönetici Girişi">
              <ShieldCheck className="icon-4" />
              Yönetici Girişi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
