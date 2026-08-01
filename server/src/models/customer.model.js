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
  };
  return withCreateFields({ ...defaults, ...data });
}
