import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Gauge,
  Fuel,
  Cog,
  Tag,
  CheckCircle2,
  Send,
} from "lucide-react";
import { getVehicleById } from "../data/vehicles";
import { useVehiclesVersion } from "../hooks/useVehiclesVersion";
import { useInquiryForm } from "../hooks/useInquiryForm";
import { WhatsAppIcon } from "../components/common/BrandIcons";
import { buildWhatsAppLink } from "../config/siteConfig";
import PropertyGallery from "../components/listings/PropertyGallery";
import SimilarVehicles from "../components/listings/SimilarVehicles";
// property-detail.css'i BİLEREK aynen kullanıyoruz — düzen (galeri + bilgi
// sütunu + form + benzer-öğeler sidebar'ı) tamamen aynı, sadece hangi
// spec'lerin gösterildiği farklı. bkz. PropertyDetail.jsx'in eşdeğeri.
import "./PropertyDetail.css";

/** "/arac/:id" — PropertyDetail.jsx ile aynı desen (galeri/form/benzer-öğeler), araç spec'lerine uyarlanmış. */
export default function VehicleDetail() {
  const { id } = useParams();
  useVehiclesVersion();
  const vehicle = getVehicleById(id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!vehicle) {
    return (
      <section className="property-detail__not-found">
        <h1 className="property-detail__not-found-title">Araç Bulunamadı</h1>
        <p className="property-detail__not-found-text">
          Aradığınız araç ilanı kaldırılmış veya yayından kaldırılmış olabilir.
        </p>
        <Link to="/araclar" className="property-detail__not-found-cta">
          Araçlara Dön
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="property-detail__back-section">
        <Link to="/araclar" className="property-detail__back-link">
          <ArrowLeft className="icon-4" />
          Araçlara Dön
        </Link>
      </section>

      <section className="property-detail__grid">
        <div className="property-detail__main">
          <PropertyGallery property={vehicle} />

          <div className="property-detail__header">
            <div>
              <div className="property-detail__listing-no">
                <Tag className="icon-4" />
                İlan No: {vehicle.listingNo}
              </div>
              <h1 className="property-detail__title">{vehicle.title}</h1>
              <p className="property-detail__location">
                {vehicle.brand} {vehicle.model} · {vehicle.color}
              </p>
            </div>
            <p className="property-detail__price">{vehicle.price}</p>
          </div>

          <div className="property-detail__specs property-detail__specs--cols-3">
            <div className="property-detail__spec-item">
              <Gauge className="property-detail__spec-icon" />
              <div className="property-detail__spec-text">
                <p className="property-detail__spec-label">KM</p>
                <p className="property-detail__spec-value">{Number(vehicle.km).toLocaleString("tr-TR")}</p>
              </div>
            </div>
            <div className="property-detail__spec-item">
              <Fuel className="property-detail__spec-icon" />
              <div className="property-detail__spec-text">
                <p className="property-detail__spec-label">Yakıt</p>
                <p className="property-detail__spec-value">{vehicle.fuelType}</p>
              </div>
            </div>
            <div className="property-detail__spec-item">
              <Cog className="property-detail__spec-icon" />
              <div className="property-detail__spec-text">
                <p className="property-detail__spec-label">Vites</p>
                <p className="property-detail__spec-value">{vehicle.transmission}</p>
              </div>
            </div>
          </div>

          {vehicle.description && (
            <div className="property-detail__section">
              <h2 className="property-detail__section-title">Araç Hakkında</h2>
              <p className="property-detail__description">{vehicle.description}</p>
            </div>
          )}
        </div>

        <div className="property-detail__form-wrap">
          <VehicleInquirySection key={vehicle.id} vehicle={vehicle} />
        </div>

        <div className="property-detail__sidebar">
          <SimilarVehicles vehicle={vehicle} />
        </div>
      </section>
    </>
  );
}

/** ListingInquirySection (PropertyDetail.jsx) ile aynı desen — bkz. o dosyanın yorumu. */
function VehicleInquirySection({ vehicle }) {
  const { form, isSubmitted, isSubmitting, error, handleChange, handleSubmit } = useInquiryForm(
    `${vehicle.title} (İlan No: ${vehicle.listingNo})`,
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
            <h2 className="inquiry-title">Bu Araçla İlgileniyorsanız Hemen İletişime Geçin</h2>
            <p className="inquiry-subtitle">
              “{vehicle.title}” ilanı ile ilgileniyorsanız, bilgilerinizi bırakın, danışmanımız en kısa sürede sizi arasın.
            </p>

            <form onSubmit={handleSubmit} className="inquiry-form">
              <div>
                <label htmlFor="vi-name" className="inquiry-form__label">
                  Ad Soyad
                </label>
                <input
                  id="vi-name"
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
                <label htmlFor="vi-phone" className="inquiry-form__label">
                  Telefon
                </label>
                <input
                  id="vi-phone"
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
                <label htmlFor="vi-message" className="inquiry-form__label">
                  Mesajınız
                </label>
                <textarea
                  id="vi-message"
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
              href={buildWhatsAppLink(`Merhaba, "${vehicle.title}" (İlan No: ${vehicle.listingNo}) ile ilgileniyorum.`)}
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
