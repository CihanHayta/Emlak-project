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
import { useInquiryForm } from "../hooks/useInquiryForm";
import { WhatsAppIcon } from "../components/common/BrandIcons";
import { buildWhatsAppLink } from "../config/siteConfig";
import PropertyGallery from "../components/listings/PropertyGallery";
import SimilarListings from "../components/listings/SimilarListings";

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
 * The listing's `videoUrl` is a placeholder clip for now — see the comment
 * next to PLACEHOLDER_VIDEO_URL in data/properties.js. Once the admin panel
 * can upload real walkthrough videos, only that data needs to change; this
 * page already plays whatever `videoUrl` it's given.
 */
export default function PropertyDetail() {
  const { id } = useParams();
  const property = getPropertyById(id);

  // Land on the detail page scrolled to the top, not wherever the listing
  // grid above happened to be scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!property) {
    return (
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-brand-navy">İlan Bulunamadı</h1>
        <p className="mt-2 text-gray-500">
          Aradığınız ilan kaldırılmış veya yayından kaldırılmış olabilir.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-lg bg-brand-gold px-6 py-3 font-semibold text-white transition hover:bg-brand-gold-dark"
        >
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
      <section className="mx-auto max-w-7xl px-6 pt-8">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-brand-gold-dark"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-16 pt-4 lg:grid-cols-3">
        {/* Left: media gallery + full listing info */}
        <div className="lg:col-span-2">
          <PropertyGallery property={property} />

          {/* Title + price */}
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <Tag className="h-4 w-4" />
                İlan No: {property.listingNo}
              </div>
              <h1 className="text-2xl font-extrabold text-brand-navy sm:text-3xl">{property.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-gray-500">
                <MapPin className="h-4 w-4" />
                {property.neighborhood}, {property.district}
              </p>
            </div>
            <p className="text-2xl font-bold text-brand-gold-dark sm:text-3xl">{property.price}</p>
          </div>

          {/* Specs — land listings show Alan/İmar Durumu instead of
              Oda Sayısı/Kat, since room count and floor don't apply to raw land. */}
          <div className={`mt-6 grid gap-4 rounded-2xl border border-gray-100 p-5 shadow-sm ${isArsa ? "grid-cols-2" : "grid-cols-3"}`}>
            {isArsa ? (
              <>
                <div className="flex items-center gap-2.5">
                  <Ruler className="h-5 w-5 text-brand-gold" />
                  <div>
                    <p className="text-xs text-gray-500">Alan</p>
                    <p className="font-semibold text-brand-navy">{property.area} m²</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="h-5 w-5 text-brand-gold" />
                  <div>
                    <p className="text-xs text-gray-500">İmar Durumu</p>
                    <p className="font-semibold text-brand-navy">{property.zoningStatus}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <BedDouble className="h-5 w-5 text-brand-gold" />
                  <div>
                    <p className="text-xs text-gray-500">Oda Sayısı</p>
                    <p className="font-semibold text-brand-navy">{property.rooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Ruler className="h-5 w-5 text-brand-gold" />
                  <div>
                    <p className="text-xs text-gray-500">Alan</p>
                    <p className="font-semibold text-brand-navy">{property.area} m²</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-5 w-5 text-brand-gold" />
                  <div>
                    <p className="text-xs text-gray-500">Kat</p>
                    <p className="font-semibold text-brand-navy">{property.floor}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-bold text-brand-navy">İlan Hakkında</h2>
              <p className="leading-relaxed text-gray-600">{property.description}</p>
            </div>
          )}

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-bold text-brand-navy">Özellikler</h2>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {property.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2 text-gray-600">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: similar listings sidebar — sticks in place while scrolling
            through the description/specs on the left, so both stay visible
            at once instead of the sidebar disappearing upward. */}
        <div className="lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <SimilarListings property={property} />
        </div>
      </section>

      {/* Keyed by listing id: React Router keeps this page's component
          instance mounted when navigating between two "/ilan/:id" listings
          (only the param changes), so without this key a "Teşekkür ederiz"
          shown for listing A would incorrectly still show after clicking
          through to listing B instead of resetting to a fresh form. */}
      <ListingInquirySection key={property.id} property={property} />
    </>
  );
}

/** CTA + lead-capture form shown at the bottom of every listing detail page. */
function ListingInquirySection({ property }) {
  const { form, isSubmitted, handleChange, handleSubmit } = useInquiryForm(
    `${property.title} (İlan No: ${property.listingNo})`,
  );

  return (
    <section className="bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm sm:p-10">
        {isSubmitted ? (
          <div className="flex flex-col items-center py-6">
            <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-500" />
            <h2 className="mb-2 text-xl font-bold text-brand-navy">Teşekkür ederiz!</h2>
            <p className="text-gray-600">
              Bilgileriniz ve talepleriniz alındı, en kısa zamanda size ulaşacağız.
              Bizi tercih ettiğiniz için teşekkür ederiz.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-brand-navy">
              Hayalinizdeki Evler İçin Hemen İletişime Geçin
            </h2>
            <p className="mx-auto mt-2 max-w-md text-gray-500">
              “{property.title}” ilanı ile ilgileniyorsanız, bilgilerinizi bırakın,
              danışmanımız en kısa sürede sizi arasın.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
              <div>
                <label htmlFor="i-name" className="mb-1 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
                />
              </div>
              <div>
                <label htmlFor="i-phone" className="mb-1 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
                />
              </div>
              <div>
                <label htmlFor="i-message" className="mb-1 block text-sm font-medium text-gray-700">
                  Mesajınız
                </label>
                <textarea
                  id="i-message"
                  name="message"
                  rows={3}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Eklemek istediğiniz bir not var mı?"
                  className="w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                <Send className="h-4 w-4" />
                Talebi Gönder
              </button>
            </form>

            <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              veya
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <a
              href={buildWhatsAppLink(
                `Merhaba, "${property.title}" (İlan No: ${property.listingNo}) ile ilgileniyorum.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 font-semibold text-white transition hover:brightness-95"
            >
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp’tan Yazın
            </a>
          </>
        )}
      </div>
    </section>
  );
}
