/**
 * Small "inner page" hero banner (dark navy background + title + subtitle),
 * reused at the top of every page other than the homepage (Satılık,
 * Kiralık, Hakkımızda, Hizmetlerimiz, İletişim) so the site feels
 * consistent instead of every page inventing its own header treatment.
 */
export default function PageBanner({ title, subtitle }) {
  return (
    <section className="bg-brand-navy px-6 py-16 text-center">
      <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-3 max-w-xl text-gray-300">{subtitle}</p>}
    </section>
  );
}
