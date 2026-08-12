import { useEffect, useState } from "react";
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
  Check,
  Phone,
} from "lucide-react";
import { getVehicleById } from "../data/vehicles";
import { useVehiclesVersion } from "../hooks/useVehiclesVersion";
import { useInquiryForm } from "../hooks/useInquiryForm";
import { WhatsAppIcon } from "../components/common/BrandIcons";
import { SITE, buildWhatsAppLink } from "../config/siteConfig";
// Kaydırmalı (swipeable) galeri istendi — VehicleGallery.jsx'in statik
// grid'i yerine PropertyGallery.jsx (Swiper) yeniden kullanılıyor: aynı
// alan adlarını (images/image/videoUrl/hasVideo/title/id) bekliyor,
// vehicle nesnesi zaten bunları taşıyor, sıfırdan yazmaya gerek yok.
import PropertyGallery from "../components/listings/PropertyGallery";
import CarDamageDiagram from "../components/listings/CarDamageDiagram";
import SimilarVehicles from "../components/listings/SimilarVehicles";
// property-detail.css'i BİLEREK aynen kullanıyoruz — form/benzer-öğeler
// sidebar'ı, "bulunamadı" hâli gibi ortak parçalar için. bkz. o dosyanın
// PropertyDetail.jsx'teki eşdeğeri.
import "./PropertyDetail.css";
import "./VehicleDetail.css";

const STATUS_LABELS = { active: "Aktif İlan", reserved: "Rezerve", sold: "Satıldı", unpublished: "Yayından Kaldırıldı" };
const CATEGORY_LABELS = { satilik: "Satılık", kiralik: "Kiralık" };
// "Fiyat & İlan Bilgileri" artık sekme değil — fiyat/durum/pazarlık gibi
// bilgiler sayfanın en başına (başlığın hemen altına) taşındı, ilan
// tarihi/no gibi geri kalanlar zaten sağdaki "İlan Bilgileri" kartında.
const TABS = [
  { id: "ozellikler", label: "Araç Özellikleri" },
  { id: "ekspertiz", label: "Ekspertiz Raporu" },
  { id: "boya", label: "Boya & Değişen" },
  { id: "aciklama", label: "Açıklama" },
];

function formatDate(value) {
  if (!value) return "—";
  const ms = typeof value === "object" && value._seconds != null ? value._seconds * 1000 : value;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("tr-TR");
}

/** "/arac/:id" — ekran görüntüsündeki profesyonel ilan sayfası düzenine uyarlandı: galeri + sekmeler solda, fiyat/iletişim/ilan bilgisi kartları sağda. */
export default function VehicleDetail() {
  const { id } = useParams();
  useVehiclesVersion();
  const vehicle = getVehicleById(id);
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveTab(TABS[0].id);
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
          <div className="vehicle-header-row">
            <span className="vehicle-header-row__listing-no">
              <Tag className="icon-4" />
              İlan No: {vehicle.listingNo}
            </span>
          </div>

          <PropertyGallery property={vehicle} />

          <div className="property-detail__header">
            <div>
              <h1 className="property-detail__title">{vehicle.title}</h1>
              <p className="property-detail__location">
                {vehicle.brand} {vehicle.model} · {vehicle.color}
              </p>
            </div>
            <p className="property-detail__price">{vehicle.price}</p>
          </div>

          {/* Fiyat & İlan bilgileri — EN BAŞTA (eskiden 4. sekmede gizliydi). */}
          <div className="vehicle-listing-summary">
            <span className={`vehicle-status-badge vehicle-status-badge--${vehicle.status}`}>
              {STATUS_LABELS[vehicle.status] ?? STATUS_LABELS.active}
            </span>
            <span className="vehicle-listing-summary__category">{CATEGORY_LABELS[vehicle.category] ?? vehicle.category}</span>
            {vehicle.negotiable && <span className="vehicle-tag">Pazarlık Payı Var</span>}
            {vehicle.tradeIn && <span className="vehicle-tag">Takas Yapılır</span>}
            {vehicle.creditEligible && <span className="vehicle-tag">Krediye Uygun</span>}
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

          {/* Sekmeler */}
          <div className="vehicle-tabs">
            <div className="vehicle-tabs__list" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`vehicle-tabs__trigger${activeTab === tab.id ? " vehicle-tabs__trigger--active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="vehicle-tabs__panel">
              {activeTab === "ozellikler" && (
                <div className="vehicle-tech-specs">
                  <TechSpecRow label="Marka" value={vehicle.brand} />
                  <TechSpecRow label="Model" value={vehicle.model} />
                  <TechSpecRow label="Yıl" value={vehicle.year} />
                  <TechSpecRow label="Yakıt" value={vehicle.fuelType} />
                  <TechSpecRow label="Vites" value={vehicle.transmission} />
                  <TechSpecRow label="Kilometre" value={`${Number(vehicle.km).toLocaleString("tr-TR")} km`} />
                  {vehicle.bodyType && <TechSpecRow label="Kasa Tipi" value={vehicle.bodyType} />}
                  {vehicle.drivetrain && <TechSpecRow label="Çekiş" value={vehicle.drivetrain} />}
                  {vehicle.engineSize && <TechSpecRow label="Motor Hacmi" value={vehicle.engineSize} />}
                  {vehicle.enginePower && <TechSpecRow label="Motor Gücü" value={vehicle.enginePower} />}
                  {vehicle.color && <TechSpecRow label="Renk" value={vehicle.color} />}
                  {vehicle.doorCount && <TechSpecRow label="Kapı Sayısı" value={vehicle.doorCount} />}
                  {vehicle.seatCount && <TechSpecRow label="Koltuk Sayısı" value={vehicle.seatCount} />}
                  {vehicle.plateNationality && <TechSpecRow label="Plaka / Uyruk" value={vehicle.plateNationality} />}
                  <TechSpecRow label="Garanti" value={vehicle.warranty ? "Var" : "Yok"} />
                  <TechSpecRow label="Servis Bakımlı" value={vehicle.serviceMaintained ? "Evet" : "Hayır"} />
                  {vehicle.inspectionValidUntil && <TechSpecRow label="Muayene Geçerlilik" value={formatDate(vehicle.inspectionValidUntil)} />}
                  {vehicle.keyCount != null && <TechSpecRow label="Anahtar Sayısı" value={vehicle.keyCount} />}

                  {vehicle.equipment?.length > 0 && (
                    <div className="vehicle-tech-specs__equipment">
                      <h3 className="vehicle-tabs__panel-subtitle">Donanımlar</h3>
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
                </div>
              )}

              {activeTab === "ekspertiz" && (
                <div className="vehicle-tabs__panel-content">
                  {vehicle.expertiseReportUrl ? (
                    <a
                      href={vehicle.expertiseReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vehicle-expertise-cta"
                    >
                      <FileCheck2 className="icon-5" />
                      <div>
                        <p className="vehicle-expertise-cta__title">Ekspertiz Raporunu Görüntüle</p>
                        <p className="vehicle-expertise-cta__subtitle">{vehicle.expertiseReportName ?? "PDF dosyası"} — yeni sekmede açılır</p>
                      </div>
                    </a>
                  ) : (
                    <p className="vehicle-tabs__empty">Bu araç için henüz bir ekspertiz raporu yüklenmemiş.</p>
                  )}

                  {vehicle.history?.length > 0 && (
                    <div className="vehicle-tabs__panel-content" style={{ marginTop: "1.5rem" }}>
                      <h3 className="vehicle-tabs__panel-subtitle">Bakım / Araç Geçmişi</h3>
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
              )}

              {activeTab === "boya" && (
                <div className="vehicle-tabs__panel-content">
                  {hasDamageInfo ? (
                    <>
                      <div className="vehicle-damage-summary">
                        <DamageStat label="Tramer Kaydı" value={vehicle.tramerRecord || "Belirtilmemiş"} />
                        {vehicle.damageAmount > 0 && <DamageStat label="Hasar Tutarı" value={`${vehicle.damageAmount.toLocaleString("tr-TR")} TL`} />}
                        <DamageStat label="Değişen Parça" value={vehicle.changedPartsCount ?? 0} />
                        <DamageStat label="Boyalı Parça" value={vehicle.paintedPartsCount ?? 0} />
                        <DamageStat label="Lokal Boyalı Parça" value={vehicle.localPaintedPartsCount ?? 0} />
                      </div>
                      <CarDamageDiagram partsStatus={vehicle.partsStatus} />
                      {vehicle.partsStatus?.length > 0 && (
                        <table className="vehicle-parts-table">
                          <thead>
                            <tr>
                              <th>Parça</th>
                              <th>Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vehicle.partsStatus.map((row, index) => (
                              <tr key={index}>
                                <td>{row.part}</td>
                                <td>
                                  <span className={`vehicle-part-status vehicle-part-status--${row.status === "Orijinal" ? "ok" : "warn"}`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  ) : (
                    <p className="vehicle-tabs__empty">Bu araç için hasar/boya bilgisi girilmemiş.</p>
                  )}
                </div>
              )}

              {activeTab === "aciklama" && (
                <div className="vehicle-tabs__panel-content">
                  {vehicle.description ? (
                    <p className="property-detail__description">{vehicle.description}</p>
                  ) : (
                    <p className="vehicle-tabs__empty">Bu araç için ek açıklama girilmemiş.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="property-detail__sidebar vehicle-sidebar">
          <div className="vehicle-price-card">
            <p className="property-detail__price">{vehicle.price}</p>
            {isUnavailable && (
              <span className={`vehicle-status-badge vehicle-status-badge--${vehicle.status}`}>
                {STATUS_LABELS[vehicle.status]}
              </span>
            )}
            <div className="vehicle-price-card__specs">
              <span><Gauge className="icon-4" /> {Number(vehicle.km).toLocaleString("tr-TR")} km</span>
              <span><Fuel className="icon-4" /> {vehicle.fuelType}</span>
              <span><Cog className="icon-4" /> {vehicle.transmission}</span>
            </div>
          </div>

          {/* İletişim — ajans bilgisi (gerçek), tekil bir "satıcı" uydurulmadı. */}
          <div className="vehicle-contact-card">
            <h2 className="vehicle-contact-card__title">İletişim</h2>
            <p className="vehicle-contact-card__agency">{SITE.name}</p>
            <a href={SITE.phoneHref} className="vehicle-contact-card__btn vehicle-contact-card__btn--call">
              <Phone className="icon-4" />
              {SITE.phoneDisplay}
            </a>
            <a
              href={buildWhatsAppLink(`Merhaba, "${vehicle.title}" (İlan No: ${vehicle.listingNo}) ile ilgileniyorum.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="vehicle-contact-card__btn vehicle-contact-card__btn--whatsapp"
            >
              <WhatsAppIcon className="icon-4" />
              WhatsApp
            </a>
          </div>

          {/* İlan Bilgileri — hepsi gerçek veri (uydurma yok). */}
          <div className="vehicle-info-card">
            <h2 className="vehicle-contact-card__title">İlan Bilgileri</h2>
            <InfoRow label="İlan Tarihi" value={formatDate(vehicle.createdAt)} />
            <InfoRow label="Son Güncelleme" value={formatDate(vehicle.updatedAt)} />
            <InfoRow label="İlan No" value={vehicle.listingNo} />
            <InfoRow label="Kategori" value={CATEGORY_LABELS[vehicle.category] ?? vehicle.category} />
            <InfoRow label="Durum" value={STATUS_LABELS[vehicle.status] ?? STATUS_LABELS.active} />
            {vehicle.bodyType && <InfoRow label="Kasa Tipi" value={vehicle.bodyType} />}
            {vehicle.enginePower && <InfoRow label="Motor Gücü" value={vehicle.enginePower} />}
            {vehicle.engineSize && <InfoRow label="Motor Hacmi" value={vehicle.engineSize} />}
            {vehicle.drivetrain && <InfoRow label="Çekiş" value={vehicle.drivetrain} />}
            {vehicle.doorCount && <InfoRow label="Kapı Sayısı" value={vehicle.doorCount} />}
            <InfoRow label="Takasa Uygun" value={vehicle.tradeIn ? "Evet" : "Hayır"} />
            <InfoRow label="Krediye Uygun" value={vehicle.creditEligible ? "Evet" : "Hayır"} />
          </div>

          <SimilarVehicles vehicle={vehicle} />
        </div>

        <div id="vehicle-inquiry-form" className="property-detail__form-wrap">
          <VehicleInquirySection key={vehicle.id} vehicle={vehicle} />
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

function InfoRow({ label, value }) {
  return (
    <div className="vehicle-info-card__row">
      <span>{label}</span>
      <strong>{value}</strong>
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
