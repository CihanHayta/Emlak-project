import { WhatsAppIcon } from "./BrandIcons";
import { buildWhatsAppLink } from "../../config/siteConfig";
import "./WhatsAppButton.css";

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
      className="whatsapp-button"
    >
      <WhatsAppIcon className="icon-7" />
    </a>
  );
}
