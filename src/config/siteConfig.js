/**
 * Central place for all "business info" that belongs to the real-estate
 * agency itself (name, phone, address, social links, etc).
 *
 * Keeping this in a single file means the agency owner only has to edit
 * ONE place when their phone number / address / socials change, instead of
 * hunting through every component that happens to print a phone number.
 */

export const SITE = {
  name: "Şahin Emlak",
  shortName: "ŞAHİN EMLAK",
  slogan: "Hayalinizdeki Evi Bulmanın En Doğru Adresi",

  // Displayed phone number (human readable format)
  phoneDisplay: "+90 555 123 45 67",
  // `tel:` links need the raw, dial-able number
  phoneHref: "tel:+905551234567",

  email: "info@sahinemlak.com",

  address: "Yenişehir Mah. İstasyon Cad. No: 25/1 Pendik / İstanbul",

  // WhatsApp number in international format WITHOUT the leading "+"
  // (this is the format https://wa.me/ expects).
  whatsappNumber: "905551234567",

  // TODO(owner): replace "#" with the agency's real social media URLs.
  social: {
    facebook: "#",
    instagram: "#",
    youtube: "#",
    linkedin: "#",
  },
};

/**
 * Builds a `wa.me` deep link that opens WhatsApp with a pre-filled message.
 * Centralized here so every "Contact us on WhatsApp" button behaves the same
 * way and only needs to supply its own message text.
 */
export function buildWhatsAppLink(message) {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
