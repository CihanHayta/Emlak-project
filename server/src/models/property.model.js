// server/src/models/property.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `properties` — bir ilan. `rooms`/`floor` sadece Daire/Müstakil'de,
 * `zoningStatus` sadece Arsa'da anlamlı; ilgisiz olduğu tipte `null` kalır
 * (frontend zaten `type === "Arsa"` dallanmasıyla hangisini göstereceğine
 * karar veriyor, bkz. admin/pages/ListingForm.jsx).
 *
 * `price` bilerek hazır biçimlendirilmiş bir gösterim string'i ("2.750.000
 * TL", "12.000 TL / Aylık") — sayısal bir alan değil. Bu, mevcut
 * PropertyCard/filtre/sıralama kodunun (digit-stripping ile sayıya çeviren
 * parsePriceNumber) hiç değişmeden çalışmaya devam etmesini sağlıyor.
 */
export function createDefaultProperty({
  category,
  type,
  title,
  price,
  province = "İstanbul",
  district,
  neighborhood,
  street = "",
  rooms = null,
  area = 0,
  floor = null,
  zoningStatus = null,
  image = "",
  images = [],
  hasVideo = false,
  videoDuration = null,
  videoUrl = null,
  description = "",
  amenities = [],
  showLocation = true,
  status = "published", // "published" | "unpublished" — vehicle.model.js ile aynı desen
}) {
  return withCreateFields({
    category, // "satilik" | "kiralik"
    type, // "Daire" | "Müstakil" | "Arsa"
    title,
    listingNo: String(Math.floor(100000 + Math.random() * 900000)),
    price,
    province,
    district,
    neighborhood,
    street,
    rooms,
    area,
    floor,
    zoningStatus,
    image,
    images,
    hasVideo,
    videoDuration,
    videoUrl,
    description,
    amenities,
    showLocation,
    status,
  });
}
