import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Home as HomeIcon, Menu, X, ShieldCheck } from "lucide-react";
import { WhatsAppIcon } from "../common/BrandIcons";
import { NAV_LINKS } from "../../config/navigation";
import { SITE, buildWhatsAppLink } from "../../config/siteConfig";
import "./Header.css";

/**
 * Sticky top navigation bar.
 *
 * Renders the same `NAV_LINKS` list twice: once as a horizontal menu for
 * desktop and once as a stacked slide-down panel for mobile, toggled by the
 * hamburger button. Only one of the two is visible at a time depending on
 * viewport width — see the media query in Header.css.
 */
export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header__inner">
        {/* Logo */}
        <NavLink to="/" className="header__logo" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="header__logo-icon">
            <HomeIcon className="icon-5" />
          </span>
          <span className="header__logo-text">{SITE.shortName}</span>
        </NavLink>

        {/* Desktop navigation */}
        <nav className="header__nav-desktop">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => `header__nav-link${isActive ? " header__nav-link--active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTA + admin access */}
        <div className="header__actions-desktop">
          <a
            href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
            target="_blank"
            rel="noopener noreferrer"
            className="header__cta"
          >
            <WhatsAppIcon className="icon-4" />
            Bize Ulaşın
          </a>
          <Link to="/admin" title="Yönetici Girişi" aria-label="Yönetici Girişi" className="header__admin-link">
            <ShieldCheck className="icon-5" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          className="header__mobile-toggle"
        >
          {isMobileMenuOpen ? <X className="icon-6" /> : <Menu className="icon-6" />}
        </button>
      </div>

      {/* Mobile navigation panel */}
      {isMobileMenuOpen && (
        <nav className="header__nav-mobile">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `header__nav-link-mobile${isActive ? " header__nav-link-mobile--active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <a
            href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
            target="_blank"
            rel="noopener noreferrer"
            className="header__cta-mobile"
          >
            <WhatsAppIcon className="icon-4" />
            Bize Ulaşın
          </a>
          <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="header__admin-link-mobile">
            <ShieldCheck className="icon-4" />
            Yönetici Girişi
          </Link>
        </nav>
      )}
    </header>
  );
}
