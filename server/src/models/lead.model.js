// server/src/models/lead.model.js
import { withCreateFields } from "./base.model.js";

/**
 * Public site form submissions -> admin "Başvurular" inbox.
 * `funnelId`: doldurulmuşsa bu lead bir kampanya sayfasından (bkz.
 * funnel.model.js) geldi demektir — admin'in "Funnel" ekranında o
 * funnel'a özel başvuru listesini filtrelemek için kullanılır.
 */
export function createDefaultLead({ name, phone, message = "", context = null, funnelId = null }) {
  return withCreateFields({ name, phone, message, context, funnelId, status: "Yeni" });
}
