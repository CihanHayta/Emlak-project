import { Link } from "react-router-dom";
import "./NotFound.css";

/** Catch-all "*" route — shown for any URL that doesn't match a real page. */
export default function NotFound() {
  return (
    <section className="not-found">
      <p className="not-found__code">404</p>
      <h1 className="not-found__title">Sayfa Bulunamadı</h1>
      <p className="not-found__text">Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link to="/" className="not-found__cta">
        Anasayfaya Dön
      </Link>
    </section>
  );
}
