// server/src/models/vehicle.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `vehicles` — satılık/kiralık araç ilanı. property.model.js ile aynı
 * desen (bkz. o dosyanın yorumları): `price` hazır biçimlendirilmiş bir
 * gösterim string'i ("450.000 TL"), sayısal bir alan değil.
 *
 * `brand`/`model` BİLEREK serbest metin (select değil) — yüzlerce marka,
 * binlerce model var, sabit bir liste hem bakımı zor hem kullanımı yavaş
 * olurdu. `fuelType`/`transmission` ise küçük, sabit bir seçenek kümesi
 * olduğu için select — filtreleme tutarlılığı ("Otomatik" yerine "oto"
 * yazılmasın diye) önemli.
 */
export function createDefaultVehicle({
  category,
  brand,
  model,
  year,
  km = 0,
  fuelType,
  transmission,
  color = "",
  title,
  price,
  image = "",
  images = [],
  hasVideo = false,
  videoDuration = null,
  videoUrl = null,
  description = "",
}) {
  return withCreateFields({
    category, // "satilik" | "kiralik"
    brand,
    model,
    year,
    km,
    fuelType, // "Benzin" | "Dizel" | "LPG" | "Elektrik" | "Hibrit"
    transmission, // "Manuel" | "Otomatik"
    color,
    title,
    listingNo: String(Math.floor(100000 + Math.random() * 900000)),
    price,
    image,
    images,
    hasVideo,
    videoDuration,
    videoUrl,
    description,
  });
}
