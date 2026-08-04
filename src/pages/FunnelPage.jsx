import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Home as HomeIcon } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { WhatsAppIcon } from "../components/common/BrandIcons";
import { SITE, buildWhatsAppLink } from "../config/siteConfig";
import "./FunnelPage.css";

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

function youtubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

/**
 * "/kampanya/:slug" — Instagram/reklam trafiği için oluşturulan, admin
 * panelden (bkz. admin/pages/FunnelForm.jsx) yönetilen tek sayfalık
 * kampanya sitesi. BİLEREK <Layout/> DIŞINDA (bkz. App.jsx) — genel site
 * navigasyonu/footer'ı yok, ziyaretçinin dikkati sadece CTA/form üzerinde
 * kalsın diye. `status !== "published"` olan bir funnel için backend 404
 * döner (taslaklar public'e sızmaz).
 */
export default function FunnelPage() {
  const { slug } = useParams();
  const [funnel, setFunnel] = useState(undefined); // undefined = yükleniyor, null = bulunamadı
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      // Sessizce yut, kullanıcıya genel bir hata göster — teknik detay gerekmiyor.
      setSubmitted(false);
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
  const whatsappHref = buildWhatsAppLink(funnel.ctaWhatsappMessage || funnel.headline);

  return (
    <div className="funnel-page">
      <header className="funnel-page__brand">
        <span className="funnel-page__brand-icon">
          <HomeIcon className="icon-5" />
        </span>
        {SITE.name}
      </header>

      <section
        className="funnel-page__hero"
        style={funnel.heroImage ? { backgroundImage: `url(${funnel.heroImage})` } : undefined}
      >
        <div className="funnel-page__hero-overlay" />
        <div className="funnel-page__hero-content">
          <h1 className="funnel-page__headline">{funnel.headline || funnel.name}</h1>
          {funnel.subheadline && <p className="funnel-page__subheadline">{funnel.subheadline}</p>}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="funnel-page__cta">
            <WhatsAppIcon className="icon-5" />
            {funnel.ctaText || "Hemen Bilgi Al"}
          </a>
        </div>
      </section>

      {embedUrl && (
        <section className="funnel-page__video-section">
          <div className="funnel-page__video-wrap">
            <iframe
              src={embedUrl}
              title={funnel.headline || funnel.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {funnel.formEnabled && (
        <section className="funnel-page__form-section">
          {submitted ? (
            <p className="funnel-page__success">Teşekkürler! En kısa sürede sizinle iletişime geçeceğiz.</p>
          ) : (
            <form className="funnel-page__form" onSubmit={handleSubmit}>
              <h2 className="funnel-page__form-title">Bilgilerinizi Bırakın, Sizi Arayalım</h2>
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
                placeholder="Mesajınız (opsiyonel)"
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              />
              <button type="submit" disabled={submitting}>
                {submitting ? "Gönderiliyor..." : "Gönder"}
              </button>
            </form>
          )}
        </section>
      )}

      <section className="funnel-page__final-cta">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="funnel-page__cta">
          <WhatsAppIcon className="icon-5" />
          {funnel.ctaText || "Hemen Bilgi Al"}
        </a>
      </section>
    </div>
  );
}
