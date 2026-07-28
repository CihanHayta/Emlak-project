/**
 * Müşteriler (CRM) data store.
 *
 * Same pattern as lib/leadStore.js: plain localStorage read/write + a
 * change event, so any component (customer list, dashboard stat cards, the
 * appointment form's customer picker) can read the same data and stay in
 * sync without a shared state library. Swap for real API calls once a
 * backend exists — every function here keeps the same shape.
 */
const STORAGE_KEY = "sahin-admin-customers";

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.getTime();
}

// Seed customers so the CRM doesn't look empty on first visit. Phone
// numbers/names intentionally match the sample Randevular data below (and
// the appointment screenshot the agency owner shared) so the two pages
// cross-reference the same people.
const SEED_CUSTOMERS = [
  {
    id: "cust-1",
    role: "Alıcı",
    sellingListingId: null,
    name: "Ahmet Kaya",
    phone: "0555 123 45 67",
    email: "ahmet.kaya@example.com",
    instagram: "@ahmetkaya",
    photo: null,
    source: "Instagram",
    status: "Randevu Oluşturuldu",
    interests: ["Müstakil", "Villa", "Yatırımlık"],
    budgetMin: 5000000,
    budgetMax: 9000000,
    desiredProvince: "İstanbul",
    desiredDistrict: "Tuzla",
    notes: "Sessiz mahalle istiyor. Nakit alacak.",
    tags: ["Sıcak Müşteri"],
    timeline: [
      { id: "t1", label: "Instagram'dan yazdı", at: daysAgo(6) },
      { id: "t2", label: "Telefon edildi", at: daysAgo(4) },
      { id: "t3", label: "Randevu oluşturuldu", at: daysAgo(1) },
    ],
    createdAt: daysAgo(6),
  },
  {
    id: "cust-2",
    role: "Alıcı",
    sellingListingId: null,
    name: "Zeynep Demir",
    phone: "0532 987 65 43",
    email: "zeynep.demir@example.com",
    instagram: "",
    photo: null,
    source: "Web Sitesi",
    status: "Randevu Oluşturuldu",
    interests: ["3+1", "Deniz Manzaralı"],
    budgetMin: 3500000,
    budgetMax: 5000000,
    desiredProvince: "İstanbul",
    desiredDistrict: "Kartal",
    notes: "Metroya yakın olsun.",
    tags: ["VIP"],
    timeline: [
      { id: "t1", label: "Web sitesinden form doldurdu", at: daysAgo(5) },
      { id: "t2", label: "Telefon edildi", at: daysAgo(3) },
      { id: "t3", label: "Randevu oluşturuldu", at: daysAgo(1) },
    ],
    createdAt: daysAgo(5),
  },
  {
    id: "cust-3",
    role: "Alıcı",
    sellingListingId: null,
    name: "Mehmet Yılmaz",
    phone: "0541 234 56 78",
    email: "mehmet.yilmaz@example.com",
    instagram: "",
    photo: null,
    source: "Sahibinden",
    status: "Teklif Verildi",
    interests: ["3+1", "Deniz Manzaralı"],
    budgetMin: 4000000,
    budgetMax: 4500000,
    desiredProvince: "İstanbul",
    desiredDistrict: "Maltepe",
    notes: "Çocuklu aile. Okula yakın olmasını istiyor.",
    tags: ["Sıcak Müşteri"],
    timeline: [
      { id: "t1", label: "Sahibinden üzerinden aradı", at: daysAgo(8) },
      { id: "t2", label: "Randevu oluşturuldu", at: daysAgo(2) },
      { id: "t3", label: "Teklif gönderildi", at: daysAgo(0) },
    ],
    createdAt: daysAgo(8),
  },
  {
    id: "cust-4",
    role: "Alıcı",
    sellingListingId: null,
    name: "Elif Şahin",
    phone: "0530 111 22 33",
    email: "elif.sahin@example.com",
    instagram: "@elifsahin",
    photo: null,
    source: "WhatsApp",
    status: "Randevu Oluşturuldu",
    interests: ["3+1", "Site İçinde"],
    budgetMin: 18000,
    budgetMax: 24000,
    desiredProvince: "İstanbul",
    desiredDistrict: "Pendik",
    notes: "Çocuklu aile, sessiz mahalle istiyor.",
    tags: [],
    timeline: [
      { id: "t1", label: "WhatsApp'tan yazdı", at: daysAgo(3) },
      { id: "t2", label: "Randevu oluşturuldu", at: daysAgo(1) },
    ],
    createdAt: daysAgo(3),
  },
  {
    id: "cust-5",
    role: "Alıcı",
    sellingListingId: null,
    name: "Mustafa Çelik",
    phone: "0553 333 44 55",
    email: "",
    instagram: "",
    photo: null,
    source: "Facebook",
    status: "Kaybedildi",
    interests: ["2+1"],
    budgetMin: 15000,
    budgetMax: 20000,
    desiredProvince: "İstanbul",
    desiredDistrict: "Maltepe",
    notes: "Müşteri vazgeçti, ileride tekrar aranacak.",
    tags: ["Soğuk Müşteri", "Tekrar Ara"],
    timeline: [
      { id: "t1", label: "Facebook'tan yazdı", at: daysAgo(10) },
      { id: "t2", label: "Randevu oluşturuldu", at: daysAgo(7) },
      { id: "t3", label: "Randevu iptal edildi", at: daysAgo(6) },
    ],
    createdAt: daysAgo(10),
  },
  {
    id: "cust-6",
    role: "Alıcı",
    sellingListingId: null,
    name: "Ayşe Yıldız",
    phone: "0505 222 11 00",
    email: "ayse.yildiz@example.com",
    instagram: "",
    photo: null,
    source: "Referans",
    status: "Randevu Oluşturuldu",
    interests: ["2+1", "Site İçinde"],
    budgetMin: 15000,
    budgetMax: 22000,
    desiredProvince: "İstanbul",
    desiredDistrict: "Kartal",
    notes: "Bir yakınının referansıyla ulaştı. Nakit ödeyecek.",
    tags: ["Sıcak Müşteri"],
    timeline: [
      { id: "t1", label: "Referans ile ulaştı", at: daysAgo(1) },
      { id: "t2", label: "Telefon edildi", at: daysAgo(0) },
      { id: "t3", label: "Randevu oluşturuldu", at: daysAgo(0) },
    ],
    createdAt: daysAgo(1),
  },
  {
    // Demo "Satıcı" (seller) customer, linked to a listing that's been
    // sitting for a few months (see AGE_OVERRIDE_MONTHS in listingStore.js)
    // so the stale-listing reminder has something real to show on this card.
    id: "cust-7",
    role: "Satıcı",
    sellingListingId: "satilik-1",
    name: "Kemal Aydın",
    phone: "0544 777 88 99",
    email: "kemal.aydin@example.com",
    instagram: "",
    photo: null,
    source: "Referans",
    status: "Randevu Oluşturuldu",
    interests: [],
    budgetMin: 0,
    budgetMax: 0,
    desiredProvince: "",
    desiredDistrict: "",
    notes: "Dairesini satışa çıkardı, fiyat konusunda esnek olabilir.",
    tags: ["Sıcak Müşteri"],
    timeline: [
      { id: "t1", label: "Referans ile ulaştı", at: daysAgo(95) },
      { id: "t2", label: "İlan oluşturuldu", at: daysAgo(90) },
    ],
    createdAt: daysAgo(95),
  },
];

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CUSTOMERS));
  return SEED_CUSTOMERS;
}

function writeAll(customers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  window.dispatchEvent(new CustomEvent("customerstore:change"));
}

/** All customer cards, newest first. */
export function getCustomers() {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getCustomerById(id) {
  return readAll().find((c) => c.id === id) ?? null;
}

/** Creates a new customer card (manual entry, or converted from an incoming lead). */
export function addCustomer(data) {
  const customer = {
    id: crypto.randomUUID(),
    role: "Alıcı",
    sellingListingId: null,
    photo: null,
    email: "",
    instagram: "",
    interests: [],
    tags: [],
    timeline: [{ id: crypto.randomUUID(), label: "Müşteri kartı oluşturuldu", at: Date.now() }],
    createdAt: Date.now(),
    ...data,
  };
  writeAll([...readAll(), customer]);
  return customer;
}

/** Updates an existing customer card (notes, status, tags, budget, ...). */
export function updateCustomer(id, updates) {
  writeAll(readAll().map((c) => (c.id === id ? { ...c, ...updates } : c)));
}

/** Appends one timeline entry (e.g. "Randevu oluşturuldu") to a customer's history. */
export function addTimelineEntry(id, label) {
  writeAll(
    readAll().map((c) =>
      c.id === id
        ? { ...c, timeline: [...c.timeline, { id: crypto.randomUUID(), label, at: Date.now() }] }
        : c,
    ),
  );
}

export function deleteCustomer(id) {
  writeAll(readAll().filter((c) => c.id !== id));
}

/** Subscribes to customer data changes — pair with useEffect. */
export function subscribeToCustomers(callback) {
  window.addEventListener("customerstore:change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("customerstore:change", callback);
    window.removeEventListener("storage", callback);
  };
}
