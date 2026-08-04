/**
 * Shared enums for the Müşteriler (CRM) and Randevular (appointments) admin
 * pages — kept in one file so the filter dropdowns, badges, and form
 * selects everywhere else always agree on the same set of values.
 */
import { SERVICES } from "../../data/services";

// Triage status for an incoming form submission, set on the Başvurular
// page while it still sits in the inbox (before it becomes a customer card).
export const LEAD_STATUSES = ["Yeni", "Arandı", "Bilgi Bekliyor", "Randevu Verildi", "İlgilenmiyor", "Müşteri Oldu"];

export const LEAD_STATUS_STYLES = {
  "Yeni": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  "Arandı": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  "Bilgi Bekliyor": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Randevu Verildi": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "İlgilenmiyor": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "Müşteri Oldu": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

// Web Sitesi + the 4 service-request-popup services (see data/services.js) —
// so a lead's card shows exactly which service they asked about instead of
// a generic "Web Sitesi" for everyone who came through the public site.
export const LEAD_SOURCES = [
  "Instagram",
  "WhatsApp",
  "Facebook",
  "Web Sitesi",
  "Kampanya",
  ...SERVICES.map((service) => service.title),
  "Sahibinden",
  "Hepsiemlak",
  "Arama",
  "Referans",
  "Manuel",
];

export const CUSTOMER_STATUSES = [
  "Yeni",
  "Arandı",
  "Teklif Verildi",
  "Randevu Oluşturuldu",
  "Satış Oldu",
  "Kaybedildi",
];

// Badge color per status, used by the CRM's status pill everywhere it appears.
export const CUSTOMER_STATUS_STYLES = {
  "Yeni": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "Arandı": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  "Teklif Verildi": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Randevu Oluşturuldu": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Satış Oldu": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Kaybedildi": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

// What a customer is interested in — multi-select tags on the customer card.
export const INTEREST_OPTIONS = [
  "1+1", "2+1", "3+1", "4+1", "5+1", "6+1", "7+",
  "Müstakil", "Villa", "Daire", "Arsa",
  "Yatırımlık", "Deniz Manzaralı", "Site İçinde",
];

// Free-form-ish relationship tags (separate from status — a customer can be
// both "Kaybedildi" and tagged "Tekrar Ara" for a future follow-up).
export const CUSTOMER_TAGS = ["VIP", "Yatırımcı", "Sıcak Müşteri", "Soğuk Müşteri", "Tekrar Ara"];

// Whether a customer is looking to buy/rent (Alıcı) or has a property
// listed with the agency to sell/rent out (Satıcı) — drives the "bu ilan
// N aydır satılmadı" stale-listing reminder on Satıcı cards (see
// lib/useStaleListingReminders.js).
export const CUSTOMER_ROLES = ["Alıcı", "Satıcı"];

// What the appointment is actually for — a specific listing viewing, or one
// of our services (kredi onayı, ekspertiz onayı, 7/24 destek, ...). Lets an
// appointment exist without being tied to a listing.
export const APPOINTMENT_SERVICE_TYPES = [
  "İlan Gösterimi",
  ...SERVICES.map((service) => service.title),
  "Genel Görüşme",
];

export const APPOINTMENT_STATUSES = ["Beklemede", "Onaylandı", "Tamamlandı", "İptal Edildi"];

export const APPOINTMENT_STATUS_STYLES = {
  "Beklemede": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Onaylandı": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Tamamlandı": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "İptal Edildi": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export const USER_ROLES = ["Admin", "Personel", "Danışman"];

// What each role is allowed to do — a simple permission matrix used by the
// Ayarlar > Kullanıcılar page. Real enforcement (hiding/blocking actions
// based on the logged-in user's role) is a natural next step once real
// multi-user auth exists; today this just drives the permissions UI.
export const ROLE_PERMISSIONS = {
  Admin: ["İlan Yönetimi", "Müşteri Yönetimi", "Randevu Yönetimi", "Kullanıcı Yönetimi", "Raporlar"],
  Personel: ["İlan Yönetimi", "Müşteri Yönetimi", "Randevu Yönetimi"],
  Danışman: ["Müşteri Yönetimi", "Randevu Yönetimi"],
};
