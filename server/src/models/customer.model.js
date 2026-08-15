// server/src/models/customer.model.js
import { withCreateFields } from "./base.model.js";

/** Frontend'deki customerStore.js/CustomerSheet.jsx ile birebir aynı alan seti. */
export function createDefaultCustomer(data) {
  const defaults = {
    role: "Alıcı", // Alıcı | Satıcı
    sellingListingId: null,
    name: "",
    phone: "",
    email: "",
    instagram: "",
    photo: null,
    source: "Manuel",
    status: "Yeni",
    interests: [],
    budgetMin: 0,
    budgetMax: 0,
    desiredProvince: "",
    desiredDistrict: "",
    notes: "",
    tags: [],
    timeline: [{ id: crypto.randomUUID(), label: "Müşteri kartı oluşturuldu", at: Date.now() }],
    // automation.service.js#checkLeadResponseAlerts'in idempotency alanı —
    // windowAlertSentAt/reminderSentAt ile aynı desen, bir kez uyarı
    // düşünce tekrar tekrar düşmesin diye.
    responseAlertSentAt: null,
  };
  return withCreateFields({ ...defaults, ...data });
}
