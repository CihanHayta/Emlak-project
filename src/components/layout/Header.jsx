import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Home as HomeIcon, Menu, X, ShieldCheck } from "lucide-react";
import { WhatsAppIcon } from "../common/BrandIcons";
import { NAV_LINKS } from "../../config/navigation";
import { SITE, buildWhatsAppLink } from "../../config/siteConfig";

/**
 * Sticky top navigation bar.
 *
 * Renders the same `NAV_LINKS` list twice: once as a horizontal menu for
 * desktop (`md:flex`) and once as a stacked slide-down panel for mobile,
 * toggled by the hamburger button. Only one of the two is visible at a time
 * depending on viewport width — see the Tailwind breakpoint classes below.
 */
export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-brand-navy shadow-md shadow-black/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-brand-gold text-brand-gold">
            <HomeIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-wide text-white">
            {SITE.shortName}
          </span>
        </NavLink>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `text-sm font-medium transition hover:text-brand-gold ${
                  isActive ? "text-brand-gold" : "text-gray-200"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTA + admin access */}
        <div className="hidden items-center gap-2 md:flex">
          <a
            href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold-dark"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Bize Ulaşın
          </a>
          <Link
            to="/admin"
            title="Yönetici Girişi"
            aria-label="Yönetici Girişi"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/5 hover:text-brand-gold"
          >
            <ShieldCheck className="h-5 w-5" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white md:hidden"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile navigation panel */}
      {isMobileMenuOpen && (
        <nav className="flex flex-col gap-1 border-t border-white/10 bg-brand-navy px-6 pb-6 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `rounded-lg px-2 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-white/5 text-brand-gold" : "text-gray-200 hover:bg-white/5"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <a
            href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-white"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Bize Ulaşın
          </a>
          <Link
            to="/admin"
            onClick={() => setIsMobileMenuOpen(false)}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200"
          >
            <ShieldCheck className="h-4 w-4" />
            Yönetici Girişi
          </Link>
        </nav>
      )}
    </header>
  );
}
