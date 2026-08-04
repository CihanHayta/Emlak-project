import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Home as HomeIcon, ChevronDown, ArrowRight, X, Quote } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { SITE } from "../config/siteConfig";
import { youtubeEmbedUrl } from "../lib/youtube";
import "./FunnelPage.css";

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

const TESTIMONIALS = [
  {
    initials: "M.A.",
    text: "Bütçemize uygun 3 farklı seçeneği aynı hafta gösterdiler, hiç oyalanmadık. İki hafta içinde anahtarı elimizdeydi.",
  },
  {
    initials: "S.K.",
    text: "Yatırım için daire arıyordum, bölge ve getiri konusunda gerçekten doğru yönlendirdiler. Süreç boyunca hep bilgilendirildim.",
  },
];

/** `**vurgu**` işaretli kısmı altın rengi bir <span>'e çevirir (bkz. FunnelForm.jsx'teki ipucu). */
function renderHeadline(headline) {
  return headline.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="funnel-page__highlight">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * "/kampanya/:slug" — Instagram/reklam trafiği için hazırlanan, admin
 * panelden (bkz. admin/pages/FunnelForm.jsx) sadece metin/CTA alanları
 * düzenlenebilen tek sayfalık kampanya sitesi. BİLEREK <Layout/> DIŞINDA
 * (bkz. App.jsx) — genel site navigasyonu/footer'ı yok, ziyaretçinin
 * dikkati sadece CTA/randevu formunda kalsın diye. `status !== "published"`
 * olan bir funnel için backend 404 döner (taslaklar public'e sızmaz).
 *
 * CTA butonu bir yere yönlendirmek yerine bir popup (randevu formu) açar —
 * form gönderimi `/public/leads`'e `funnelId` ile düşer, admin panelde bu
 * funnel'ın "Başvurular" listesinde görünür (bkz. FunnelForm.jsx).
 */
export default function FunnelPage() {
  const { slug } = useParams();
  const [funnel, setFunnel] = useState(undefined); // undefined = yükleniyor, null = bulunamadı
  const [popupOpen, setPopupOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [funnel]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/public/funnels/${slug}?tenantId=${TENANT_ID}`)
      .then((data) => !cancelled && setFunnel(data))
      .catch(() => !cancelled && setFunnel(null));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!popupOpen) return;
    document.body.style.overflow = "hidden";
    function handleKey(e) {
      if (e.key === "Escape") setPopupOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [popupOpen]);

  function openPopup() {
    setSubmitted(false);
    setForm({ name: "", phone: "", message: "" });
    setPopupOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post("/public/leads", {
        tenantId: TENANT_ID,
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        context: funnel.name,
        funnelId: funnel.id,
      });
      setSubmitted(true);
    } catch {
      alert("Gönderilemedi, lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (funnel === undefined) {
    return (
      <div className="funnel-page funnel-page--loading">
        <Loader2 className="icon-7 funnel-page__spinner" />
      </div>
    );
  }

  if (funnel === null) {
    return (
      <div className="funnel-page funnel-page--loading">
        <p>Bu sayfa artık mevcut değil.</p>
        <Link to="/" className="funnel-page__back-link">
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  const embedUrl = youtubeEmbedUrl(funnel.videoUrl);
  const hasDirectVideo = Boolean(funnel.videoUrl) && !embedUrl;
  const hasVideo = Boolean(embedUrl) || hasDirectVideo;
  const ctaText = funnel.ctaText || "Hemen Randevu Al";
  const headline = funnel.headline || SITE.slogan;
  const subheadline =
    funnel.subheadline ||
    "İster ilk eviniz olsun ister yatırım amaçlı arıyor olun, ihtiyacınıza en uygun portföyü birlikte bulalım.";

  return (
    <div className="funnel-page">
      <header className="funnel-page__brand">
        <span className="funnel-page__brand-icon">
          <HomeIcon className="icon-5" />
        </span>
        {SITE.name}
      </header>

      <section
        ref={heroRef}
        className="funnel-page__hero"
        style={funnel.heroImage ? { backgroundImage: `url(${funnel.heroImage})` } : undefined}
      >
        <div className="funnel-page__hero-grid" />
        <div className="funnel-page__hero-overlay" />
        <div className="funnel-page__hero-content">
          <h1 className="funnel-page__headline">{renderHeadline(headline)}</h1>
          <div className="funnel-page__divider" />
          <p className="funnel-page__subheadline">{subheadline}</p>

          {hasVideo ? (
            <a href="#funnel-video" className="funnel-page__video-pointer">
              Videoyu izle
              <ChevronDown className="icon-4" />
            </a>
          ) : (
            funnel.formEnabled && (
              <button type="button" className="funnel-page__cta" onClick={openPopup}>
                {ctaText}
                <ArrowRight className="icon-5" />
              </button>
            )
          )}
        </div>
      </section>

      {hasVideo && (
        <section id="funnel-video" className="funnel-page__video-section">
          <div className="funnel-page__video-wrap">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={funnel.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={funnel.videoUrl} controls playsInline />
            )}
          </div>
        </section>
      )}

      <section className="funnel-page__testimonials">
        {TESTIMONIALS.map((t) => (
          <div key={t.initials} className="funnel-page__testimonial-card">
            <Quote className="icon-5 funnel-page__quote-icon" />
            <p className="funnel-page__testimonial-text">{t.text}</p>
            <div className="funnel-page__testimonial-avatar">{t.initials}</div>
          </div>
        ))}
      </section>

      {funnel.formEnabled && (
        <section className="funnel-page__final-cta">
          <h2 className="funnel-page__final-cta-title">Sıra Sizde!</h2>
          <button type="button" className="funnel-page__cta" onClick={openPopup}>
            {ctaText}
            <ArrowRight className="icon-5" />
          </button>
          <p className="funnel-page__trust-line">
            Size Özel Portföy Sunumu&nbsp;•&nbsp;Ücretsiz Danışmanlık&nbsp;•&nbsp;Hızlı Geri Dönüş
          </p>
        </section>
      )}

      <footer className="funnel-page__footer">
        <div className="funnel-page__footer-links">
          <Link to="/gizlilik-politikasi">Gizlilik Politikası</Link>
          <a href={`mailto:${SITE.email}`}>İletişim</a>
        </div>
        <p className="funnel-page__disclaimer">
          Bu sayfa Meta/Instagram&apos;ın bir parçası değildir ve Meta tarafından onaylanmamıştır.
        </p>
      </footer>

      {funnel.formEnabled && (
        <button
          type="button"
          className={`funnel-page__sticky-cta ${heroVisible ? "" : "funnel-page__sticky-cta--visible"}`}
          onClick={openPopup}
        >
          {ctaText}
          <ArrowRight className="icon-4" />
        </button>
      )}

      {popupOpen && (
        <div className="funnel-page__modal-overlay" onClick={() => setPopupOpen(false)}>
          <div className="funnel-page__modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="funnel-page__modal-close" onClick={() => setPopupOpen(false)} aria-label="Kapat">
              <X className="icon-5" />
            </button>
            {submitted ? (
              <p className="funnel-page__success">Teşekkürler! En kısa sürede sizi arayarak randevunuzu netleştireceğiz.</p>
            ) : (
              <form className="funnel-page__form" onSubmit={handleSubmit}>
                <h2 className="funnel-page__form-title">Randevu Talebiniz</h2>
                <p className="funnel-page__form-subtitle">Bilgilerinizi bırakın, sizi arayalım.</p>
                <input
                  type="text"
                  required
                  placeholder="Adınız Soyadınız"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="tel"
                  required
                  placeholder="Telefon Numaranız"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <textarea
                  rows={3}
                  placeholder="Ne zaman görüşmek istersiniz? (opsiyonel)"
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? "Gönderiliyor..." : "Randevu Talep Et"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
