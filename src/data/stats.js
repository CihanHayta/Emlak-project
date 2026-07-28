/**
 * The 4 trust-building stats shown under the hero ("500+ Mutlu Müşteri" etc).
 * `icon` is a key resolved to a lucide-react component in StatsBar.jsx,
 * keeping this file pure data (no JSX) so it's easy to tweak the numbers
 * without touching any component code.
 */
export const HERO_STATS = [
  { id: 1, icon: "users", value: "500+", label: "Mutlu Müşteri" },
  { id: 2, icon: "home", value: "250+", label: "Satış" },
  { id: 3, icon: "award", value: "10+", label: "Yıllık Tecrübe" },
  { id: 4, icon: "key", value: "100+", label: "Kiralık İlan" },
];
