// server/src/models/lead.model.js
import { withCreateFields } from "./base.model.js";

/** Public site form submissions -> admin "Başvurular" inbox. */
export function createDefaultLead({ name, phone, message = "", context = null }) {
  return withCreateFields({ name, phone, message, context, status: "Yeni" });
}
