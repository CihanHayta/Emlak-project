import { WhatsAppIcon } from "./BrandIcons";
import { buildWhatsAppLink } from "../../config/siteConfig";

/**
 * Floating WhatsApp button, fixed to the bottom-right corner on every page
 * (rendered once in Layout.jsx). Clicking it opens WhatsApp with a friendly
 * pre-filled greeting so visitors don't start from a blank chat.
 */
export default function WhatsAppButton() {
  return (
    <a
      href={buildWhatsAppLink("Merhaba, Şahin Emlak hakkında bilgi almak istiyorum.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp üzerinden bize ulaşın"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105 hover:shadow-xl"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
