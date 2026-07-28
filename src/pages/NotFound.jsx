import { Link } from "react-router-dom";

/** Catch-all "*" route — shown for any URL that doesn't match a real page. */
export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-gold">404</p>
      <h1 className="mt-4 text-2xl font-bold text-brand-navy">Sayfa Bulunamadı</h1>
      <p className="mt-2 text-gray-500">Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link
        to="/"
        className="mt-8 rounded-lg bg-brand-gold px-6 py-3 font-semibold text-white transition hover:bg-brand-gold-dark"
      >
        Anasayfaya Dön
      </Link>
    </section>
  );
}
