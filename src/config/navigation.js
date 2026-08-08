/**
 * Main site navigation, shared between the Header (top navbar + mobile menu)
 * and the Footer ("Hızlı Linkler" column) so both always stay in sync.
 *
 * NOTE: "Blog" was intentionally removed per the agency owner's request.
 */
export const NAV_LINKS = [
  { label: "Anasayfa", to: "/" },
  { label: "Satılık", to: "/satilik" },
  { label: "Kiralık", to: "/kiralik" },
  { label: "Araçlar", to: "/araclar" },
  { label: "Hakkımızda", to: "/hakkimizda" },
  { label: "Hizmetlerimiz", to: "/hizmetlerimiz" },
  { label: "İletişim", to: "/iletisim" },
];
