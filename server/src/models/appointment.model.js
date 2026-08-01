// server/src/models/appointment.model.js
import { withCreateFields } from "./base.model.js";

/** Frontend'deki appointmentStore.js ile birebir aynı alan seti (listing enrichment hariç — o frontend'de, properties.js üzerinden yapılıyor). */
export function createDefaultAppointment(data) {
  const defaults = {
    customerId: null,
    serviceType: "İlan Gösterimi",
    listingId: null,
    dateTime: Date.now(),
    status: "Beklemede", // Beklemede | Onaylandı | Tamamlandı | İptal Edildi
    note: "",
  };
  return withCreateFields({ ...defaults, ...data });
}
