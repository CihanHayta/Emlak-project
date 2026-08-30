import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  Ruler,
  Building2,
  FileCheck2,
  Tag,
  MapPin,
  Check,
  CheckCircle2,
  Send,
} from "lucide-react";
import { getPropertyById } from "../data/properties";
import { usePropertiesVersion } from "../hooks/usePropertiesVersion";
import { useInquiryForm } from "../hooks/useInquiryForm";
import { WhatsAppIcon } from "../components/common/BrandIcons";
import { buildWhatsAppLink } from "../config/siteConfig";
import PropertyGallery from "../components/listings/PropertyGallery";
import SimilarListings from "../components/listings/SimilarListings";
import "./PropertyDetail.css";

/**
 * "/ilan/:id" — single listing detail page.
 *
 * Reached by clicking any PropertyCard (homepage video rows or the
 * Satılık/Kiralık grids). Left column: media gallery (video tour, if any,
 * autoplaying muted as the first slide, followed by photos — see
 * PropertyGallery) + full listing info. Right column: "Benzer İlanlar"
 * sidebar (SimilarListings) so visitors can keep browsing without leaving
 * the page.
 *
 */
export default function PropertyDetail() {
  const { id } = useParams();
  usePropertiesVersion(); // without this, the listing fetch resolving after first paint would never re-render past "İlan Bulunamadı"
  const property = getPropertyById(id);

  // Land on the detail page scrolled to the top, not wherever the listing
  // grid above happened to be scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!property) {
    return (
      <section className="property-detail__not-found">
        <h1 className="property-detail__not-found-title">İlan Bulunamadı</h1>
        <p className="property-detail__not-found-text">
          Aradığınız ilan kaldırılmış veya yayından kaldırılmış olabilir.
        </p>
        <Link to="/" className="property-detail__not-found-cta">
          Anasayfaya Dön
        </Link>
      </section>
    );
  }

  const isForSale = property.category === "satilik";
  const backHref = isForSale ? "/satilik" : "/kiralik";
  const backLabel = isForSale ? "Satılık İlanlarına Dön" : "Kiralık İlanlarına Dön";
  const isArsa = property.type === "Arsa";

  return (
    <>
      <section className="property-detail__back-section">
        <Link to={backHref} className="property-detail__back-link">
          <ArrowLeft className="icon-4" />
          {backLabel}
        </Link>
      </section>

      <section className="property-detail__grid">
        {/* Left: media gallery + full listing info */}
        <div className="property-detail__main">
          <PropertyGallery property={property} />

          {/* Title + price */}
          <div className="property-detail__header">
            <div>
              <div className="property-detail__listing-no">
                <Tag className="icon-4" />
                İlan No: {property.listingNo}
              </div>
              <h1 className="property-detail__title">{property.title}</h1>
              <p className="property-detail__location">
                <MapPin className="icon-4" />
                {property.neighborhood}, {property.district}
              </p>
            </div>
            <p className="property-detail__price">{property.price}</p>
          </div>

          {/* Specs — land listings show Alan/İmar Durumu instead of
              Oda Sayısı/Kat, since room count and floor don't apply to raw land. */}
          <div className={`property-detail__specs ${isArsa ? "property-detail__specs--cols-2" : "property-detail__specs--cols-3"}`}>
            {isArsa ? (
              <>
                <div className="property-detail__spec-item">
                  <Ruler className="property-detail__spec-icon" />
                  <div className="property-detail__spec-text">
                    <p className="property-detail__spec-label">Alan</p>
                    <p className="property-detail__spec-value">{property.area} m²</p>
                  </div>
                </div>
                <div className="property-detail__spec-item">
                  <FileCheck2 className="property-detail__spec-icon" />
                  <div className="property-detail__spec-text">
                    <p className="property-detail__spec-label">İmar Durumu</p>
                    <p className="property-detail__spec-value">{property.zoningStatus}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="property-detail__spec-item">
                  <BedDouble className="property-detail__spec-icon" />
                  <div className="property-detail__spec-text">
                    <p className="property-detail__spec-label">Oda Sayısı</p>
                    <p className="property-detail__spec-value">{property.rooms}</p>
                  </div>
                </div>
                <div className="property-detail__spec-item">
                  <Ruler className="property-detail__spec-icon" />
                  <div className="property-detail__spec-text">
                    <p className="property-detail__spec-label">Alan</p>
                    <p className="property-detail__spec-value">{property.area} m²</p>
                  </div>
                </div>
                <div className="property-detail__spec-item">
                  <Building2 className="property-detail__spec-icon" />
                  <div className="property-detail__spec-text">
                    <p className="property-detail__spec-label">Kat</p>
                    <p className="property-detail__spec-value">{property.floor}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="property-detail__section">
              <h2 className="property-detail__section-title">İlan Hakkında</h2>
              <p className="property-detail__description">{property.description}</p>
            </div>
          )}

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="property-detail__section">
              <h2 className="property-detail__section-title">Özellikler</h2>
              <ul className="property-detail__amenities-list">
                {property.amenities.map((amenity) => (
                  <li key={amenity} className="property-detail__amenity-item">
                    <Check className="property-detail__amenity-icon" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Lead-capture form: right after the listing details on mobile
            (capturing the form is the priority — a visitor shouldn't have
            to scroll past "Benzer İlanlar" first to find it), but back to
            being a full-width band below both columns on desktop. Keyed by
            listing id: React Router keeps this page's component instance
            mounted when navigating between two "/ilan/:id" listings (only
            the param changes), so without this key a "Teşekkür ederiz"
            shown for listing A would incorrectly still show after clicking
            through to listing B instead of resetting to a fresh form. */}
        <div className="property-detail__form-wrap">
          <ListingInquirySection key={property.id} property={property} />
        </div>

        {/* Right: similar listings sidebar — sticks in place while scrolling
            through the description/specs on the left, so both stay visible
            at once instead of the sidebar disappearing upward. Comes after
            the form on mobile, but stays beside the main content on desktop. */}
        <div className="property-detail__sidebar">
          <SimilarListings property={property} />
        </div>
      </section>
    </>
  );
}

/** CTA + lead-capture form shown at the bottom of every listing detail page. */
function ListingInquirySection({ property }) {
  const { form, isSubmitted, isSubmitting, error, handleChange, handleSubmit } = useInquiryForm(
    `${property.title} (İlan No: ${property.listingNo})`,
  );

  return (
    <div className="inquiry-section">
      <div className="inquiry-card">
        {isSubmitted ? (
          <div className="inquiry-thankyou">
            <CheckCircle2 className="inquiry-thankyou__icon" />
            <h2 className="inquiry-thankyou__title">Teşekkür ederiz!</h2>
            <p className="inquiry-thankyou__text">
              Bilgileriniz ve talepleriniz alındı, en kısa zamanda size ulaşacağız.
              Bizi tercih ettiğiniz için teşekkür ederiz.
            </p>
          </div>
        ) : (
          <>
            <h2 className="inquiry-title">Hayalinizdeki Evler İçin Hemen İletişime Geçin</h2>
            <p className="inquiry-subtitle">
              “{property.title}” ilanı ile ilgileniyorsanız, bilgilerinizi bırakın,
              danışmanımız en kısa sürede sizi arasın.
            </p>

            <form onSubmit={handleSubmit} className="inquiry-form">
              <div>
                <label htmlFor="i-name" className="inquiry-form__label">
                  Ad Soyad
                </label>
                <input
                  id="i-name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Adınız Soyadınız"
                  className="inquiry-form__input"
                />
              </div>
              <div>
                <label htmlFor="i-phone" className="inquiry-form__label">
                  Telefon
                </label>
                <input
                  id="i-phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                  className="inquiry-form__input"
                />
              </div>
              <div>
                <label htmlFor="i-message" className="inquiry-form__label">
                  Mesajınız
                </label>
                <textarea
                  id="i-message"
                  name="message"
                  rows={3}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Eklemek istediğiniz bir not var mı?"
                  className="inquiry-form__input inquiry-form__input--textarea"
                />
              </div>

              {error && <p className="inquiry-form__error">{error}</p>}

              <button type="submit" className="inquiry-form__submit" disabled={isSubmitting}>
                <Send className="icon-4" />
                {isSubmitting ? "Gönderiliyor..." : "Talebi Gönder"}
              </button>
            </form>

            <div className="inquiry-divider">
              <span className="inquiry-divider__line" />
              veya
              <span className="inquiry-divider__line" />
            </div>

            <a
              href={buildWhatsAppLink(
                `Merhaba, "${property.title}" (İlan No: ${property.listingNo}) ile ilgileniyorum.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inquiry-whatsapp"
            >
              <WhatsAppIcon className="icon-4" />
              WhatsApp’tan Yazın
            </a>
          </>
        )}
      </div>
    </div>
  );
}
