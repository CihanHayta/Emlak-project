// server/src/models/vehicle.model.js
import { withCreateFields } from "./base.model.js";

/**
 * `vehicles` — satılık/kiralık araç ilanı. property.model.js ile aynı
 * desen (bkz. o dosyanın yorumları): `price` hazır biçimlendirilmiş bir
 * gösterim string'i ("450.000 TL"), sayısal bir alan değil.
 *
 * `brand`/`model` BİLEREK serbest metin (select değil) — yüzlerce marka,
 * binlerce model var, sabit bir liste hem bakımı zor hem kullanımı yavaş
 * olurdu. `fuelType`/`transmission`/`bodyType`/`drivetrain` ise küçük,
 * sabit birer seçenek kümesi olduğu için select — filtreleme tutarlılığı
 * ("Otomatik" yerine "oto" yazılmasın diye) önemli.
 *
 * `expertiseReportUrl` PUBLIC (araç detay sayfasında km yanında gösterilir)
 * — `documents`/`adminNotes` ise BİLEREK admin-only, controller/servis
 * katmanı public context'te bunları asla dönmez (bkz.
 * vehicle.service.js#toPublicVehicle).
 */
export function createDefaultVehicle({
  category,
  brand,
  model,
  year,
  km = 0,
  fuelType,
  transmission,
  bodyType = "",
  engineSize = "",
  enginePower = "",
  drivetrain = "",
  color = "",
  title,
  price,
  negotiable = false,
  tradeIn = false,
  creditEligible = false,
  status = "active",
  tramerRecord = "",
  damageAmount = 0,
  changedPartsCount = 0,
  paintedPartsCount = 0,
  localPaintedPartsCount = 0,
  partsStatus = [],
  equipment = [],
  image = "",
  images = [],
  imageCategories = {},
  hasVideo = false,
  videoDuration = null,
  videoUrl = null,
  description = "",
  history = [],
  expertiseReportUrl = null,
  expertiseReportName = null,
  documents = [],
  adminNotes = "",
}) {
  return withCreateFields({
    category, // "satilik" | "kiralik"
    brand,
    model,
    year,
    km,
    fuelType, // "Benzin" | "Dizel" | "LPG" | "Elektrik" | "Hibrit"
    transmission, // "Manuel" | "Otomatik"
    bodyType, // "Sedan" | "Hatchback" | "SUV" | "Crossover" | "Coupe" | "Cabrio" | "Station Wagon" | "Pickup" | "Panelvan" | "MPV"
    engineSize, // örn. "1.6", serbest metin — motor hacmi gösterim formatı markaya göre değişebiliyor
    enginePower, // örn. "132 HP", serbest metin
    drivetrain, // "Önden Çekiş" | "Arkadan İtiş" | "4x4"
    color,
    title,
    listingNo: String(Math.floor(100000 + Math.random() * 900000)),
    price,
    negotiable,
    tradeIn,
    creditEligible,
    status, // "active" | "reserved" | "sold" | "unpublished"
    // --- Hasar/ekspertiz ---
    tramerRecord, // serbest metin (örn. "Yok", "12.500 TL - sol ön çamurluk")
    damageAmount,
    changedPartsCount,
    paintedPartsCount,
    localPaintedPartsCount,
    partsStatus, // [{ part: "Ön Kaput", status: "Boyalı" }, ...] — status: Orijinal|Boyalı|Lokal Boyalı|Değişen
    equipment, // ["Sunroof", "Deri Koltuk", ...] — sabit listeden çoklu seçim, genişletilebilir
    image,
    images,
    imageCategories, // { [fotoğrafUrl]: "Ön" | "Arka" | ... } — bkz. admin/components/PhotoManagerList.jsx
    hasVideo,
    videoDuration,
    videoUrl,
    description,
    history, // [{ date, km, action, description }, ...] — bakım/geçmiş kayıtları
    // --- Belgeler ---
    expertiseReportUrl, // PUBLIC — araç detayında km yanında gösterilir
    expertiseReportName, // yüklenen dosyanın orijinal adı (gösterim için)
    documents, // [{ type: "servis"|"tramer"|"garanti"|"diger", url, name }, ...] — ADMIN-ONLY
    adminNotes, // ADMIN-ONLY serbest not alanı
  });
}
