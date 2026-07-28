/**
 * The 4 "service highlight" cards shown on the homepage (between the video
 * sections) and again on the Hizmetlerimiz page.
 *
 * Clicking any card opens the shared request-form popup (see
 * components/common/ServiceRequestModal.jsx) with `title` used as the
 * "talep türü" (request type) tag so the agency knows which service the
 * visitor is asking about.
 */
export const SERVICES = [
  {
    id: "ekspertiz",
    icon: "shield-check",
    title: "Ücretsiz Ekspertiz",
    description: "Evinizin değerini ücretsiz öğrenin.",
  },
  {
    id: "kredi",
    icon: "hand-coins",
    title: "Kredi Danışmanlığı",
    description: "En uygun kredi seçenekleri için yanınızdayız.",
  },
  {
    id: "tapu",
    icon: "file-check",
    title: "Tapu Takip Süreci",
    description: "Tüm yasal süreçlerde profesyonel destek.",
  },
  {
    id: "destek",
    icon: "clock",
    title: "7/24 Destek",
    description: "Her zaman yanınızda, anında çözüm.",
  },
];
