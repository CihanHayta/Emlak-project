// server/src/utils/slugify.js
//
// Direct character-map replacement instead of NFD-normalize + strip
// combining marks -- avoids embedding literal Unicode combining characters
// in source (fragile to copy/paste/encoding issues), and Turkish only has
// a handful of accented letters anyway so a lookup table is simpler.
const CHAR_MAP = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

/** "Sahin Emlak" -> "sahin-emlak" -- tenant slug, portal names etc. */
export function slugify(text) {
  const withoutTurkishChars = String(text)
    .split("")
    .map((ch) => CHAR_MAP[ch] ?? ch)
    .join("");

  return withoutTurkishChars
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
