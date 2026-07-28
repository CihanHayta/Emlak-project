import { Phone, Mail, MapPin, Send, CheckCircle2 } from "lucide-react";
import PageBanner from "../components/common/PageBanner";
import { SITE } from "../config/siteConfig";
import { useInquiryForm } from "../hooks/useInquiryForm";

/**
 * "/iletisim" — Contact page: contact details, an embedded map, and a
 * standalone contact form (separate from the service-request popup used
 * elsewhere — this one always submits as a general inquiry, no service tag).
 *
 * The map is an embedded OpenStreetMap iframe (no API key required). Swap
 * the `src` URL for the agency's real office location coordinates.
 */
export default function Iletisim() {
  const { form, isSubmitted, handleChange, handleSubmit } = useInquiryForm("İletişim Formu");

  return (
    <>
      <PageBanner
        title="İletişim"
        subtitle="Sorularınız için bize ulaşın, en kısa sürede dönüş yapalım."
      />

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2">
        {/* Contact details + map */}
        <div>
          <ul className="mb-8 space-y-5">
            <li className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-gray-500">Telefon</p>
                <a href={SITE.phoneHref} className="font-semibold text-brand-navy hover:text-brand-gold-dark">
                  {SITE.phoneDisplay}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-gray-500">E-posta</p>
                <a href={`mailto:${SITE.email}`} className="font-semibold text-brand-navy hover:text-brand-gold-dark">
                  {SITE.email}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-gray-500">Adres</p>
                <p className="font-semibold text-brand-navy">{SITE.address}</p>
              </div>
            </li>
          </ul>

          <div className="overflow-hidden rounded-2xl shadow-md">
            <iframe
              title="Ofis Konumu"
              className="h-72 w-full border-0"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=29.20%2C40.85%2C29.30%2C40.90&layer=mapnik"
            />
          </div>
        </div>

        {/* Contact form */}
        <div className="rounded-2xl border border-gray-100 p-6 shadow-sm sm:p-8">
          {isSubmitted ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-500" />
              <h3 className="mb-2 text-xl font-bold text-brand-navy">Teşekkür ederiz!</h3>
              <p className="text-gray-600">
                Bilgileriniz ve talepleriniz alındı, en kısa zamanda size
                ulaşacağız. Bizi tercih ettiğiniz için teşekkür ederiz.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="c-name" className="mb-1 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
                />
              </div>

              <div>
                <label htmlFor="c-phone" className="mb-1 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
                />
              </div>

              <div>
                <label htmlFor="c-message" className="mb-1 block text-sm font-medium text-gray-700">
                  Mesajınız
                </label>
                <textarea
                  id="c-message"
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Mesajınızı buraya yazabilirsiniz..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                <Send className="h-4 w-4" />
                Gönder
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
