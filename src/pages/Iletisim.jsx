import { Phone, Mail, MapPin, Send, CheckCircle2 } from "lucide-react";
import PageBanner from "../components/common/PageBanner";
import { SITE } from "../config/siteConfig";
import { useInquiryForm } from "../hooks/useInquiryForm";
import "./Iletisim.css";

/**
 * "/iletisim" — Contact page: contact details, an embedded map, and a
 * standalone contact form (separate from the service-request popup used
 * elsewhere — this one always submits as a general inquiry, no service tag).
 *
 * The map is an embedded OpenStreetMap iframe (no API key required). Swap
 * the `src` URL for the agency's real office location coordinates.
 */
export default function Iletisim() {
  const { form, isSubmitted, isSubmitting, error, handleChange, handleSubmit } = useInquiryForm("İletişim Formu");

  return (
    <>
      <PageBanner
        title="İletişim"
        subtitle="Sorularınız için bize ulaşın, en kısa sürede dönüş yapalım."
      />

      <section className="contact-section">
        {/* Contact details + map */}
        <div>
          <ul className="contact-info-list">
            <li className="contact-info-item">
              <span className="contact-info-icon">
                <Phone className="icon-5" />
              </span>
              <div>
                <p className="contact-info-label">Telefon</p>
                <a href={SITE.phoneHref} className="contact-info-value">
                  {SITE.phoneDisplay}
                </a>
              </div>
            </li>
            <li className="contact-info-item">
              <span className="contact-info-icon">
                <Mail className="icon-5" />
              </span>
              <div>
                <p className="contact-info-label">E-posta</p>
                <a href={`mailto:${SITE.email}`} className="contact-info-value">
                  {SITE.email}
                </a>
              </div>
            </li>
            <li className="contact-info-item">
              <span className="contact-info-icon">
                <MapPin className="icon-5" />
              </span>
              <div>
                <p className="contact-info-label">Adres</p>
                <p className="contact-info-value">{SITE.address}</p>
              </div>
            </li>
          </ul>

          <div className="contact-map">
            <iframe
              title="Ofis Konumu"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=29.20%2C40.85%2C29.30%2C40.90&layer=mapnik"
            />
          </div>
        </div>

        {/* Contact form */}
        <div className="contact-form-card">
          {isSubmitted ? (
            <div className="contact-thankyou">
              <CheckCircle2 className="contact-thankyou__icon" />
              <h3 className="contact-thankyou__title">Teşekkür ederiz!</h3>
              <p className="contact-thankyou__text">
                Bilgileriniz ve talepleriniz alındı, en kısa zamanda size
                ulaşacağız. Bizi tercih ettiğiniz için teşekkür ederiz.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div>
                <label htmlFor="c-name" className="contact-form__label">
                  Ad Soyad
                </label>
                <input
                  id="c-name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Adınız Soyadınız"
                  className="contact-form__input"
                />
              </div>

              <div>
                <label htmlFor="c-phone" className="contact-form__label">
                  Telefon
                </label>
                <input
                  id="c-phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                  className="contact-form__input"
                />
              </div>

              <div>
                <label htmlFor="c-message" className="contact-form__label">
                  Mesajınız
                </label>
                <textarea
                  id="c-message"
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Mesajınızı buraya yazabilirsiniz..."
                  className="contact-form__input contact-form__input--textarea"
                />
              </div>

              {error && <p className="contact-form__error">{error}</p>}

              <button type="submit" className="contact-form__submit" disabled={isSubmitting}>
                <Send className="icon-4" />
                {isSubmitting ? "Gönderiliyor..." : "Gönder"}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
