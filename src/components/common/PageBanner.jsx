import "./PageBanner.css";

/**
 * Small "inner page" hero banner (dark navy background + title + subtitle),
 * reused at the top of every page other than the homepage (Satılık,
 * Kiralık, Hakkımızda, Hizmetlerimiz, İletişim) so the site feels
 * consistent instead of every page inventing its own header treatment.
 */
export default function PageBanner({ title, subtitle }) {
  return (
    <section className="page-banner">
      <h1 className="page-banner__title">{title}</h1>
      {subtitle && <p className="page-banner__subtitle">{subtitle}</p>}
    </section>
  );
}
