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
  FileCheck2,
  ShieldAlert,
  Wrench,
  Check,
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
import "./VehicleDetail.css";

const STATUS_LABELS = { active: "Aktif", reserved: "Rezerve", sold: "Satıldı", unpublished: "Yayından Kaldırıldı" };

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

  const isUnavailable = vehicle.status === "sold" || vehicle.status === "reserved";
  const hasDamageInfo =
    vehicle.tramerRecord || vehicle.damageAmount > 0 || vehicle.changedPartsCount > 0 ||
    vehicle.paintedPartsCount > 0 || vehicle.localPaintedPartsCount > 0 || vehicle.partsStatus?.length > 0;

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
                {isUnavailable && (
                  <span className={`vehicle-status-badge vehicle-status-badge--${vehicle.status}`}>
                    {STATUS_LABELS[vehicle.status]}
                  </span>
                )}
              </div>
              <h1 className="property-detail__title">{vehicle.title}</h1>
              <p className="property-detail__location">
                {vehicle.brand} {vehicle.model} · {vehicle.color}
              </p>
              {(vehicle.negotiable || vehicle.tradeIn || vehicle.creditEligible) && (
                <div className="vehicle-tags">
                  {vehicle.negotiable && <span className="vehicle-tag">Pazarlık Payı Var</span>}
                  {vehicle.tradeIn && <span className="vehicle-tag">Takas Yapılır</span>}
                  {vehicle.creditEligible && <span className="vehicle-tag">Krediye Uygun</span>}
                </div>
              )}
            </div>
            <p className="property-detail__price">{vehicle.price}</p>
          </div>

          {/* Kilometre + ekspertiz raporu — spec'in özellikle vurguladığı, dikkat çekici alan. */}
          <div className="vehicle-km-expertise">
            <span className="vehicle-km-expertise__km">
              <Gauge className="icon-4" />
              {Number(vehicle.km).toLocaleString("tr-TR")} km
            </span>
            {vehicle.expertiseReportUrl && (
              <>
                <span className="vehicle-km-expertise__divider">|</span>
                <a
                  href={vehicle.expertiseReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vehicle-km-expertise__report"
                >
                  <FileCheck2 className="icon-4" />
                  Ekspertiz Raporu
                </a>
              </>
            )}
          </div>

          <div className="property-detail__specs property-detail__specs--cols-3">
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
            {vehicle.bodyType && (
              <div className="property-detail__spec-item">
                <Tag className="property-detail__spec-icon" />
                <div className="property-detail__spec-text">
                  <p className="property-detail__spec-label">Kasa Tipi</p>
                  <p className="property-detail__spec-value">{vehicle.bodyType}</p>
                </div>
              </div>
            )}
          </div>

          {/* Teknik özellikler — daha kapsamlı liste. */}
          <div className="vehicle-tech-specs">
            {vehicle.engineSize && <TechSpecRow label="Motor Hacmi" value={vehicle.engineSize} />}
            {vehicle.enginePower && <TechSpecRow label="Motor Gücü" value={vehicle.enginePower} />}
            {vehicle.drivetrain && <TechSpecRow label="Çekiş Tipi" value={vehicle.drivetrain} />}
            {vehicle.color && <TechSpecRow label="Renk" value={vehicle.color} />}
          </div>

          {vehicle.description && (
            <div className="property-detail__section">
              <h2 className="property-detail__section-title">Araç Hakkında</h2>
              <p className="property-detail__description">{vehicle.description}</p>
            </div>
          )}

          {/* Hasar / Ekspertiz bilgileri */}
          {hasDamageInfo && (
            <div className="property-detail__section">
              <h2 className="property-detail__section-title vehicle-section-title">
                <ShieldAlert className="icon-5 vehicle-section-icon" />
                Hasar / Ekspertiz Bilgileri
              </h2>
              <div className="vehicle-damage-summary">
                <DamageStat label="Tramer Kaydı" value={vehicle.tramerRecord || "Belirtilmemiş"} />
                {vehicle.damageAmount > 0 && <DamageStat label="Hasar Tutarı" value={`${vehicle.damageAmount.toLocaleString("tr-TR")} TL`} />}
                <DamageStat label="Değişen Parça" value={vehicle.changedPartsCount ?? 0} />
                <DamageStat label="Boyalı Parça" value={vehicle.paintedPartsCount ?? 0} />
                <DamageStat label="Lokal Boyalı Parça" value={vehicle.localPaintedPartsCount ?? 0} />
              </div>
              {vehicle.partsStatus?.length > 0 && (
                <ul className="vehicle-parts-list">
                  {vehicle.partsStatus.map((row, index) => (
                    <li key={index} className="vehicle-parts-list__item">
                      <span>{row.part}</span>
                      <span className={`vehicle-part-status vehicle-part-status--${row.status === "Orijinal" ? "ok" : "warn"}`}>
                        {row.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Donanımlar */}
          {vehicle.equipment?.length > 0 && (
            <div className="property-detail__section">
              <h2 className="property-detail__section-title">Donanımlar</h2>
              <ul className="property-detail__amenities-list">
                {vehicle.equipment.map((item) => (
                  <li key={item} className="property-detail__amenity-item">
                    <Check className="property-detail__amenity-icon" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bakım / Araç Geçmişi */}
          {vehicle.history?.length > 0 && (
            <div className="property-detail__section">
              <h2 className="property-detail__section-title vehicle-section-title">
                <Wrench className="icon-5 vehicle-section-icon" />
                Bakım / Araç Geçmişi
              </h2>
              <ul className="vehicle-history-list">
                {vehicle.history.map((entry, index) => (
                  <li key={index} className="vehicle-history-list__item">
                    <span className="vehicle-history-list__date">{entry.date}</span>
                    <span className="vehicle-history-list__km">{Number(entry.km || 0).toLocaleString("tr-TR")} km</span>
                    <span className="vehicle-history-list__action">{entry.action}</span>
                    {entry.description && <span className="vehicle-history-list__desc">{entry.description}</span>}
                  </li>
                ))}
              </ul>
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

function TechSpecRow({ label, value }) {
  return (
    <div className="vehicle-tech-specs__row">
      <span className="vehicle-tech-specs__label">{label}</span>
      <span className="vehicle-tech-specs__value">{value}</span>
    </div>
  );
}

function DamageStat({ label, value }) {
  return (
    <div className="vehicle-damage-summary__stat">
      <p className="vehicle-damage-summary__label">{label}</p>
      <p className="vehicle-damage-summary__value">{value}</p>
    </div>
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
