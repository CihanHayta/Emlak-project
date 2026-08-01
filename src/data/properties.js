/**
 * Sample property listings used across the site (homepage video rows, the
 * Satılık / Kiralık listing pages, and the listing detail page).
 *
 * Every listing has a `type` — "Daire" (apartment/flat), "Müstakil" (a
 * detached house/villa), or "Arsa" (a land parcel) — which is what the
 * "Tip" filter on the listing pages filters by, combined with Semt/Mahalle.
 *
 * PLACEHOLDER DATA — everything here (photos, videos, prices, listing
 * details) is sample content so the site doesn't look empty. The real plan
 * is:
 *   1) An admin panel will let the agency upload real listing videos/photos.
 *   2) Listings will come from that admin data instead of this file, but the
 *      shape (district/neighborhood/listingNo/type/...) should stay the same
 *      so the filter bar and detail page keep working unchanged.
 * Until then, this single array is the one place to edit sample listings.
 */
import { ISTANBUL_DISTRICTS } from "./istanbulLocations";

// Stock photography (Unsplash) used only until real listing photos exist.
const IMG = {
  livingRoom: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=75",
  apartmentBuilding: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=75",
  villaPoolNight: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=75",
  kitchen: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=75",
  houseExterior: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=75",
  modernApartmentBuilding: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=75",
  houseWithPool: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=75",
  houseExteriorDay: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=75",
  modernHouseExterior: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=75",
  luxuryHouseDusk: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=75",
  bedroom: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=900&q=75",
  bathroom: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=75",
  modernLivingRoom: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=900&q=75",
  modernKitchen: "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=900&q=75",
  villaExterior: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=900&q=75",
  cozyBedroom: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=75",
  modernHouseAlt: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=900&q=75",
  diningRoom: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=75",
  balconyView: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=75",
  apartmentInterior: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=75",
  poolHouse: "https://images.unsplash.com/photo-1560184611-ff3e53f00e8f?auto=format&fit=crop&w=900&q=75",
  // Land/field photography, used only for `type: "Arsa"` listings.
  arsaField: "https://images.unsplash.com/photo-1697627903173-e22b6e04734d?auto=format&fit=crop&w=900&q=75",
  arsaPlowedField: "https://images.unsplash.com/photo-1745757392529-c04da3b8a116?auto=format&fit=crop&w=900&q=75",
  arsaValley: "https://images.unsplash.com/photo-1626834478854-9b5aefd826fd?auto=format&fit=crop&w=900&q=75",
  arsaFarmland: "https://images.unsplash.com/photo-1661243514395-e7f708102267?auto=format&fit=crop&w=900&q=75",
};

// Placeholder "video tour" clip (small, CC0, hosted by MDN) reused on every
// listing that has `hasVideo: true`, purely so the detail page's autoplay
// video player has something real to demo. Swap for the agency's real
// walkthrough videos once the admin panel can upload them.
const PLACEHOLDER_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

// Generic amenity/feature sets reused across listings — tweak per-listing
// below if a property needs something more specific. Arsa (land) listings
// use a different set since "Asansör"/"Otopark" etc. don't apply to raw land.
const APARTMENT_AMENITIES = ["Asansör", "Otopark", "Güvenlik", "Isı Yalıtımı", "Doğalgaz"];
const VILLA_AMENITIES = ["Özel Havuz", "Bahçe", "Otopark", "Güvenlik", "Akıllı Ev Sistemi"];
const ARSA_FEATURES = ["Elektrik Mevcut", "Su Mevcut", "Yola Cephe", "Köşe Parsel"];

// Hand-written "flagship" listings: these have real descriptions, a photo
// gallery, and (for most) a video tour. See DISTRICT_FILLER_LISTINGS below
// for the simpler, auto-generated listings that cover every other district
// and every "Tip" (Daire/Müstakil/Arsa).
const FLAGSHIP_LISTINGS = [
  // ---- Satılık (for sale) — featured video tour cards on the homepage ----
  {
    id: "satilik-1",
    category: "satilik",
    type: "Daire",
    title: "Lüks Daire Turu",
    listingNo: "10231",
    district: "Pendik",
    neighborhood: "Yenişehir",
    rooms: "2+1",
    area: 85,
    floor: "5. Kat",
    price: "2.750.000 TL",
    image: IMG.livingRoom,
    images: [IMG.livingRoom, IMG.modernKitchen, IMG.bedroom, IMG.bathroom],
    hasVideo: true,
    videoDuration: "1:20",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Yenişehir'in merkezi konumunda, geniş balkonu ve ferah salonuyla dikkat çeken bu 2+1 daire, hem yatırım hem oturum amaçlı değerlendirilebilir. Bina merkezi ısıtma sistemine sahiptir ve ana ulaşım aksına yürüme mesafesindedir.",
    amenities: APARTMENT_AMENITIES,
  },
  {
    id: "satilik-2",
    category: "satilik",
    type: "Daire",
    title: "Sıfır Lüks Daire",
    listingNo: "10245",
    district: "Kartal",
    neighborhood: "Soğanlık Yeni",
    rooms: "3+1",
    area: 120,
    floor: "3. Kat",
    price: "4.250.000 TL",
    image: IMG.apartmentBuilding,
    images: [IMG.apartmentBuilding, IMG.modernLivingRoom, IMG.modernKitchen, IMG.cozyBedroom],
    hasVideo: true,
    videoDuration: "1:18",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Yeni tamamlanmış sitede, hiç kullanılmamış sıfır 3+1 daire. Kapalı otoparkı, çocuk oyun alanı ve 7/24 güvenliğiyle aileler için güvenli bir yaşam alanı sunar. Mutfak beyaz eşya dahil teslim edilmektedir.",
    amenities: [...APARTMENT_AMENITIES, "Çocuk Oyun Alanı", "Kapalı Otopark"],
  },
  {
    id: "satilik-3",
    category: "satilik",
    type: "Müstakil",
    title: "Müstakil Villa Turu",
    listingNo: "10252",
    district: "Tuzla",
    neighborhood: "Aydınlı",
    rooms: "4+1",
    area: 250,
    floor: "Tripleks",
    price: "8.500.000 TL",
    image: IMG.villaPoolNight,
    images: [IMG.villaPoolNight, IMG.villaExterior, IMG.diningRoom, IMG.poolHouse],
    hasVideo: true,
    videoDuration: "1:25",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Özel havuzu ve geniş bahçesiyle Aydınlı'da eşsiz bir müstakil villa. Üç kata yayılan geniş yaşam alanları, akıllı ev sistemi ve kapalı garajı ile hem konfor hem prestij arayanlar için ideal.",
    amenities: VILLA_AMENITIES,
  },
  {
    id: "satilik-4",
    category: "satilik",
    type: "Daire",
    title: "Deniz Manzaralı Daire",
    listingNo: "10260",
    district: "Maltepe",
    neighborhood: "Küçükyalı Merkez",
    rooms: "3+1",
    area: 140,
    floor: "8. Kat",
    price: "4.250.000 TL",
    image: IMG.kitchen,
    images: [IMG.kitchen, IMG.balconyView, IMG.modernLivingRoom, IMG.bedroom],
    hasVideo: true,
    videoDuration: "1:15",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Küçükyalı sahiline yakın, geniş cepheli deniz manzaralı 3+1 daire. Yüksek kattan kesintisiz manzara, ferah amerikan mutfak ve geniş balkonuyla öne çıkıyor. Sahil yürüyüş yoluna yakın konum.",
    amenities: APARTMENT_AMENITIES,
  },
  // ---- Satılık — extra listings, only shown on the /satilik page ----
  {
    id: "satilik-5",
    category: "satilik",
    type: "Müstakil",
    title: "Bahçeli Müstakil Ev",
    listingNo: "10268",
    district: "Pendik",
    neighborhood: "Kurtköy",
    rooms: "4+1",
    area: 180,
    floor: "Müstakil",
    price: "6.100.000 TL",
    image: IMG.modernHouseExterior,
    images: [IMG.modernHouseExterior, IMG.modernHouseAlt, IMG.diningRoom, IMG.cozyBedroom],
    description:
      "Kurtköy'de, havalimanına ve iş merkezlerine yakın geniş bahçeli müstakil ev. Ferah oturma alanları ve özel otoparkıyla geniş aileler için uygun bir seçenek.",
    amenities: ["Bahçe", "Otopark", "Güvenlik"],
  },
  {
    id: "satilik-6",
    category: "satilik",
    type: "Daire",
    title: "Merkezi Konumda Daire",
    listingNo: "10273",
    district: "Kartal",
    neighborhood: "Yakacık Çarşı",
    rooms: "2+1",
    area: 95,
    floor: "4. Kat",
    price: "3.200.000 TL",
    image: IMG.houseExteriorDay,
    images: [IMG.houseExteriorDay, IMG.apartmentInterior, IMG.modernKitchen, IMG.bathroom],
    description:
      "Yakacık'ın merkezinde, alışveriş merkezlerine ve toplu taşımaya yürüme mesafesinde ferah bir 2+1 daire. İlk defa ev alacaklar için uygun fiyat/imkan dengesi sunar.",
    amenities: APARTMENT_AMENITIES,
  },

  // ---- Kiralık (for rent) — featured video tour cards on the homepage ----
  {
    id: "kiralik-1",
    category: "kiralik",
    type: "Daire",
    title: "Site İçinde Kiralık Daire",
    listingNo: "20114",
    district: "Pendik",
    neighborhood: "Çınardere",
    rooms: "3+1",
    area: 120,
    floor: "6. Kat",
    price: "22.000 TL / Aylık",
    image: IMG.houseExterior,
    images: [IMG.houseExterior, IMG.modernLivingRoom, IMG.cozyBedroom, IMG.bathroom],
    hasVideo: true,
    videoDuration: "1:10",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Çınardere'de, sosyal tesisleri tam donanımlı bir sitede ferah 3+1 kiralık daire. Kapalı yüzme havuzu, fitness salonu ve 7/24 güvenlik hizmeti site sakinlerine sunuluyor.",
    amenities: [...APARTMENT_AMENITIES, "Kapalı Yüzme Havuzu", "Fitness Salonu"],
  },
  {
    id: "kiralik-2",
    category: "kiralik",
    type: "Daire",
    title: "Eşyalı Kiralık Daire",
    listingNo: "20128",
    district: "Kartal",
    neighborhood: "Cevizli",
    rooms: "2+1",
    area: 80,
    floor: "2. Kat",
    price: "18.000 TL / Aylık",
    image: IMG.modernApartmentBuilding,
    images: [IMG.modernApartmentBuilding, IMG.apartmentInterior, IMG.modernKitchen, IMG.bedroom],
    hasVideo: true,
    videoDuration: "1:08",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Cevizli'de, tüm beyaz eşyaları ve mobilyalarıyla hazır teslim eşyalı 2+1 kiralık daire. Sadece bavulunuzla taşınabileceğiniz, iş değişikliği veya kısa süreli konaklama için ideal bir seçenek.",
    amenities: APARTMENT_AMENITIES,
  },
  {
    id: "kiralik-3",
    category: "kiralik",
    type: "Daire",
    title: "Lüks Kiralık Daire",
    listingNo: "20135",
    district: "Maltepe",
    neighborhood: "Bağlarbaşı",
    rooms: "2+1",
    area: 90,
    floor: "10. Kat",
    price: "25.000 TL / Aylık",
    image: IMG.houseWithPool,
    images: [IMG.houseWithPool, IMG.poolHouse, IMG.diningRoom, IMG.balconyView],
    hasVideo: true,
    videoDuration: "1:12",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Bağlarbaşı'nda, yüksek kattan şehir manzarasına sahip lüks 2+1 kiralık daire. Sitenin ortak havuzu ve düzenli peyzajı ile konforlu bir yaşam sunuyor.",
    amenities: [...APARTMENT_AMENITIES, "Ortak Yüzme Havuzu"],
  },
  {
    id: "kiralik-4",
    category: "kiralik",
    type: "Daire",
    title: "Rezidans Kiralık Daire",
    listingNo: "20142",
    district: "Ataşehir",
    neighborhood: "İçerenköy",
    rooms: "1+1",
    area: 60,
    floor: "15. Kat",
    price: "20.000 TL / Aylık",
    image: IMG.houseExteriorDay,
    images: [IMG.houseExteriorDay, IMG.apartmentInterior, IMG.bedroom, IMG.bathroom],
    hasVideo: true,
    videoDuration: "1:05",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "İçerenköy'deki iş merkezlerine yürüme mesafesinde, rezidans konseptli 1+1 kiralık daire. Resepsiyon hizmeti ve güvenlikli giriş ile özellikle çalışanlar için pratik bir seçenek.",
    amenities: ["Resepsiyon", "Güvenlik", "Asansör", "Otopark"],
  },
  {
    id: "kiralik-5",
    category: "kiralik",
    type: "Daire",
    title: "Deniz Manzaralı Kiralık",
    listingNo: "20150",
    district: "Tuzla",
    neighborhood: "İçmeler",
    rooms: "3+1",
    area: 140,
    floor: "7. Kat",
    price: "28.000 TL / Aylık",
    image: IMG.modernHouseExterior,
    images: [IMG.modernHouseExterior, IMG.balconyView, IMG.modernLivingRoom, IMG.modernKitchen],
    hasVideo: true,
    videoDuration: "1:25",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "İçmeler sahiline yakın, geniş balkonundan deniz manzarası izlenebilen ferah 3+1 kiralık daire. Marina ve sahil kafelerine yürüme mesafesinde.",
    amenities: APARTMENT_AMENITIES,
  },
  // ---- Kiralık — extra listings, only shown on the /kiralik page ----
  {
    id: "kiralik-6",
    category: "kiralik",
    type: "Daire",
    title: "Ferah Aile Dairesi",
    listingNo: "20157",
    district: "Pendik",
    neighborhood: "Kavakpınar",
    rooms: "3+1",
    area: 130,
    floor: "3. Kat",
    price: "24.000 TL / Aylık",
    image: IMG.luxuryHouseDusk,
    images: [IMG.luxuryHouseDusk, IMG.diningRoom, IMG.cozyBedroom, IMG.bathroom],
    description:
      "Kavakpınar'da, okullara ve parka yakın geniş 3+1 kiralık aile dairesi. Düşük aidatı ve merkezi konumu ile öne çıkıyor.",
    amenities: APARTMENT_AMENITIES,
  },

  // ---- Satılık Arsalar — featured video tour cards for the homepage's
  // "Satılık Arsalar" row. Arsa listings use `area` + `zoningStatus`
  // (İmar Durumu) instead of `rooms`/`floor`, since room count and floor
  // number don't apply to raw land. ----
  {
    id: "satilik-arsa-1",
    category: "satilik",
    type: "Arsa",
    title: "Deniz Manzaralı Satılık Arsa",
    listingNo: "90001",
    district: "Şile",
    neighborhood: "Yeniköy",
    area: 850,
    zoningStatus: "Konut İmarlı",
    price: "3.400.000 TL",
    image: IMG.arsaValley,
    images: [IMG.arsaValley, IMG.arsaField, IMG.arsaFarmland],
    hasVideo: true,
    videoDuration: "1:30",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Şile Yeniköy'de, denize yakın konumda konut imarlı satılık arsa. Yatırım amaçlı veya müstakil ev inşası için idealdir.",
    amenities: ARSA_FEATURES,
  },
  {
    id: "satilik-arsa-2",
    category: "satilik",
    type: "Arsa",
    title: "Yatırımlık Satılık Tarla",
    listingNo: "90002",
    district: "Çatalca",
    neighborhood: "Ferhatpaşa",
    area: 2500,
    zoningStatus: "Tarla",
    price: "1.750.000 TL",
    image: IMG.arsaPlowedField,
    images: [IMG.arsaPlowedField, IMG.arsaField, IMG.arsaValley],
    hasVideo: true,
    videoDuration: "1:22",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Çatalca Ferhatpaşa'da, tarıma elverişli geniş satılık tarla. Uzun vadeli yatırım için uygun fiyatlı bir fırsat.",
    amenities: ARSA_FEATURES,
  },
  {
    id: "satilik-arsa-3",
    category: "satilik",
    type: "Arsa",
    title: "Geniş Bahçeli Satılık Arsa",
    listingNo: "90003",
    district: "Silivri",
    neighborhood: "Selimpaşa",
    area: 1200,
    zoningStatus: "Bağ-Bahçe İmarlı",
    price: "2.250.000 TL",
    image: IMG.arsaField,
    images: [IMG.arsaField, IMG.arsaFarmland, IMG.arsaPlowedField],
    hasVideo: true,
    videoDuration: "1:18",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Silivri Selimpaşa'da, bağ-bahçe imarlı, sahile yakın satılık arsa. Yazlık veya bahçeli müstakil ev için ideal.",
    amenities: ARSA_FEATURES,
  },
  {
    id: "satilik-arsa-4",
    category: "satilik",
    type: "Arsa",
    title: "Ticari İmarlı Satılık Arsa",
    listingNo: "90004",
    district: "Arnavutköy",
    neighborhood: "Hadımköy",
    area: 1800,
    zoningStatus: "Ticari İmarlı",
    price: "5.600.000 TL",
    image: IMG.arsaFarmland,
    images: [IMG.arsaFarmland, IMG.arsaValley, IMG.arsaField],
    hasVideo: true,
    videoDuration: "1:27",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Hadımköy'de, ana yola cepheli ticari imarlı satılık arsa. Depo, showroom veya işyeri yatırımı için elverişli.",
    amenities: ARSA_FEATURES,
  },

  // ---- Kiralık Arsalar — featured video tour cards for the homepage's
  // "Kiralık Arsalar" row. Renting raw land is less common than renting a
  // home, but it's a real practice for farmland/storage use in Turkey. ----
  {
    id: "kiralik-arsa-1",
    category: "kiralik",
    type: "Arsa",
    title: "Kiralık Tarla",
    listingNo: "90101",
    district: "Çatalca",
    neighborhood: "Muratbey Merkez",
    area: 5000,
    zoningStatus: "Tarla",
    price: "8.000 TL / Aylık",
    image: IMG.arsaPlowedField,
    images: [IMG.arsaPlowedField, IMG.arsaValley, IMG.arsaField],
    hasVideo: true,
    videoDuration: "1:15",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Çatalca Muratbey Merkez'de, tarımsal üretime uygun geniş kiralık tarla. Sulama imkanı mevcuttur.",
    amenities: ARSA_FEATURES,
  },
  {
    id: "kiralik-arsa-2",
    category: "kiralik",
    type: "Arsa",
    title: "Kiralık Bağ-Bahçe Arazisi",
    listingNo: "90102",
    district: "Şile",
    neighborhood: "Ahmetli",
    area: 1500,
    zoningStatus: "Bağ-Bahçe İmarlı",
    price: "5.500 TL / Aylık",
    image: IMG.arsaValley,
    images: [IMG.arsaValley, IMG.arsaFarmland, IMG.arsaField],
    hasVideo: true,
    videoDuration: "1:10",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Şile Ahmetli'de, doğayla iç içe kiralık bağ-bahçe arazisi. Hobi bahçeciliği için elverişlidir.",
    amenities: ARSA_FEATURES,
  },
  {
    id: "kiralik-arsa-3",
    category: "kiralik",
    type: "Arsa",
    title: "Kiralık Depolama Arsası",
    listingNo: "90103",
    district: "Silivri",
    neighborhood: "Fatih",
    area: 3000,
    zoningStatus: "Ticari İmarlı",
    price: "12.000 TL / Aylık",
    image: IMG.arsaFarmland,
    images: [IMG.arsaFarmland, IMG.arsaPlowedField, IMG.arsaValley],
    hasVideo: true,
    videoDuration: "1:20",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    description:
      "Silivri Fatih'te, ana yola yakın, açık depolama veya lojistik kullanımına uygun kiralık arsa.",
    amenities: ARSA_FEATURES,
  },
];

// Turkish -> ASCII-ish character map, just enough to build clean listing ids
// (e.g. "Küçükçekmece" -> "kucukcekmece") from district names.
const TURKISH_CHAR_MAP = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i", ö: "o", Ö: "o",
  ş: "s", Ş: "s", ü: "u", Ü: "u",
};
const slugify = (text) =>
  text
    .split("")
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// A little variety (room count/size/floor) for the auto-generated Daire
// listings below, cycled by district index rather than repeating the exact
// same spec.
const SAMPLE_SPECS = [
  { rooms: "1+1", area: 55, floor: "2. Kat" },
  { rooms: "2+1", area: 90, floor: "4. Kat" },
  { rooms: "3+1", area: 120, floor: "6. Kat" },
  { rooms: "4+1", area: 160, floor: "3. Kat" },
];
const ZONING_OPTIONS = ["Konut İmarlı", "Ticari İmarlı", "Tarla", "Bağ-Bahçe İmarlı"];
const FILLER_IMAGES = Object.values(IMG).filter((url) => !url.includes("arsa"));
const ARSA_FILLER_IMAGES = [IMG.arsaField, IMG.arsaPlowedField, IMG.arsaValley, IMG.arsaFarmland];

/**
 * Three simple listings — one Daire, one Müstakil, one Arsa — per İstanbul
 * district, PER category (satılık/kiralık): 39 districts x 2 categories x 3
 * types = 234 listings, generated from data/istanbulLocations.js.
 *
 * This means choosing ANY combination of "Semt" + "Tip" in the filter bar
 * (e.g. "Esenyurt" + "Müstakil", or "Esenyurt" + "Arsa") returns at least
 * one result on both the Satılık and Kiralık pages — useful for
 * demoing/testing that the filters actually work across the whole city,
 * not just the handful of districts with hand-written flagship listings
 * above.
 *
 * Deliberately simpler than the flagship listings (no video, one stock
 * photo, a short generic description): once real listings start coming from
 * the admin panel, these are the first ones to delete.
 */
const DISTRICT_FILLER_LISTINGS = ISTANBUL_DISTRICTS.flatMap((district, index) => {
  const neighborhood = district.neighborhoods[0];
  const slug = slugify(district.name);
  const spec = SAMPLE_SPECS[index % SAMPLE_SPECS.length];
  const zoning = ZONING_OPTIONS[index % ZONING_OPTIONS.length];
  const image = FILLER_IMAGES[index % FILLER_IMAGES.length];
  const arsaImage = ARSA_FILLER_IMAGES[index % ARSA_FILLER_IMAGES.length];
  const arsaArea = 500 + (index % 6) * 250;

  const daireSalePrice = (1_850_000 + index * 150_000).toLocaleString("tr-TR");
  const daireRentPrice = (12_000 + index * 850).toLocaleString("tr-TR");
  const villaSalePrice = (4_200_000 + index * 180_000).toLocaleString("tr-TR");
  const villaRentPrice = (28_000 + index * 950).toLocaleString("tr-TR");
  const arsaSalePrice = (900_000 + index * 95_000).toLocaleString("tr-TR");
  const arsaRentPrice = (4_000 + index * 300).toLocaleString("tr-TR");

  return [
    // ---- Daire ----
    {
      id: `satilik-daire-${slug}`,
      category: "satilik",
      type: "Daire",
      title: `${district.name} Satılık Daire`,
      listingNo: String(30001 + index),
      district: district.name,
      neighborhood,
      ...spec,
      price: `${daireSalePrice} TL`,
      image,
      description: `${neighborhood}, ${district.name} bölgesinde, ulaşımı kolay ${spec.rooms} satılık daire.`,
      amenities: APARTMENT_AMENITIES,
    },
    {
      id: `kiralik-daire-${slug}`,
      category: "kiralik",
      type: "Daire",
      title: `${district.name} Kiralık Daire`,
      listingNo: String(40001 + index),
      district: district.name,
      neighborhood,
      ...spec,
      price: `${daireRentPrice} TL / Aylık`,
      image,
      description: `${neighborhood}, ${district.name} bölgesinde, ulaşımı kolay ${spec.rooms} kiralık daire.`,
      amenities: APARTMENT_AMENITIES,
    },
    // ---- Müstakil ----
    {
      id: `satilik-mustakil-${slug}`,
      category: "satilik",
      type: "Müstakil",
      title: `${district.name} Satılık Müstakil Ev`,
      listingNo: String(50001 + index),
      district: district.name,
      neighborhood,
      rooms: "4+1",
      area: spec.area + 60,
      floor: "Müstakil",
      price: `${villaSalePrice} TL`,
      image,
      description: `${neighborhood}, ${district.name} bölgesinde bahçeli, müstakil satılık ev.`,
      amenities: VILLA_AMENITIES,
    },
    {
      id: `kiralik-mustakil-${slug}`,
      category: "kiralik",
      type: "Müstakil",
      title: `${district.name} Kiralık Müstakil Ev`,
      listingNo: String(60001 + index),
      district: district.name,
      neighborhood,
      rooms: "4+1",
      area: spec.area + 60,
      floor: "Müstakil",
      price: `${villaRentPrice} TL / Aylık`,
      image,
      description: `${neighborhood}, ${district.name} bölgesinde bahçeli, müstakil kiralık ev.`,
      amenities: VILLA_AMENITIES,
    },
    // ---- Arsa ----
    {
      id: `satilik-arsa-${slug}`,
      category: "satilik",
      type: "Arsa",
      title: `${district.name} Satılık Arsa`,
      listingNo: String(70001 + index),
      district: district.name,
      neighborhood,
      area: arsaArea,
      zoningStatus: zoning,
      price: `${arsaSalePrice} TL`,
      image: arsaImage,
      description: `${neighborhood}, ${district.name} bölgesinde, ${zoning.toLowerCase()} satılık arsa.`,
      amenities: ARSA_FEATURES,
    },
    {
      id: `kiralik-arsa-${slug}`,
      category: "kiralik",
      type: "Arsa",
      title: `${district.name} Kiralık Arsa`,
      listingNo: String(80001 + index),
      district: district.name,
      neighborhood,
      area: arsaArea,
      zoningStatus: zoning,
      price: `${arsaRentPrice} TL / Aylık`,
      image: arsaImage,
      description: `${neighborhood}, ${district.name} bölgesinde, ${zoning.toLowerCase()} kiralık arsa.`,
      amenities: ARSA_FEATURES,
    },
  ];
});

export const PROPERTIES = [...FLAGSHIP_LISTINGS, ...DISTRICT_FILLER_LISTINGS];

// Must match admin/data/listingStore.js's own STORAGE_KEY. Not imported
// directly from there to avoid a circular import (that module imports
// PROPERTIES from *this* file to seed itself) — this reads the same
// localStorage key independently instead.
const ADMIN_LISTINGS_KEY = "sahin-admin-listings";

/**
 * The admin panel has no backend: everything it creates/edits lives in this
 * browser's localStorage (admin/data/listingStore.js). listingStore seeds
 * itself from every listing in PROPERTIES (same id), so editing ANY listing
 * through the admin panel — including one of the sample/seed ones, e.g. to
 * upload real photos/video onto it — writes back under that same id. Every
 * getter below reads through this instead of the raw PROPERTIES constant,
 * and admin data always WINS over the static seed for a matching id, so
 * those edits actually show up on the public site instead of being silently
 * discarded.
 */
function getAllProperties() {
  try {
    const raw = localStorage.getItem(ADMIN_LISTINGS_KEY);
    if (!raw) return PROPERTIES;
    const adminListings = JSON.parse(raw);
    const adminById = new Map(adminListings.map((listing) => [listing.id, listing]));
    const staticIds = new Set(PROPERTIES.map((p) => p.id));

    const merged = PROPERTIES.map((property) => adminById.get(property.id) ?? property);
    const newFromAdmin = adminListings.filter((listing) => !staticIds.has(listing.id));
    return [...merged, ...newFromAdmin];
  } catch {
    return PROPERTIES;
  }
}

/** All "satılık" (for-sale) listings, homepage + listing page share this. */
export const getSaleProperties = () =>
  getAllProperties().filter((p) => p.category === "satilik");

/** All "kiralık" (for-rent) listings, homepage + listing page share this. */
export const getRentProperties = () =>
  getAllProperties().filter((p) => p.category === "kiralik");

/**
 * Listings with a video tour, used by the homepage carousels.
 * - `getFeaturedVideos("satilik")` -> the "Satılık Evler" row (Daire + Müstakil).
 * - `getFeaturedVideos("satilik", "Arsa")` -> the "Satılık Arsalar" row.
 * Land listings are excluded from the plain (no `type` arg) call so they
 * don't show up twice — once in "Evler" and again in "Arsalar".
 */
export const getFeaturedVideos = (category, type) =>
  getAllProperties().filter(
    (p) => p.category === category && p.hasVideo && (type ? p.type === type : p.type !== "Arsa"),
  );

/** Looks up a single listing by id — used by the listing detail page. */
export const getPropertyById = (id) => getAllProperties().find((p) => p.id === id);

/**
 * "Benzer İlanlar" (similar listings) for the detail page sidebar: same
 * category (satılık/kiralık) as `property`, preferring the same type
 * (Daire/Müstakil/Arsa) and district first, then relaxing district, then
 * type, so there's always a decent number of suggestions.
 */
export const getSimilarProperties = (property, limit = 8) => {
  const others = getAllProperties().filter((p) => p.id !== property.id && p.category === property.category);
  const sameTypeSameDistrict = others.filter((p) => p.type === property.type && p.district === property.district);
  const sameTypeOtherDistrict = others.filter((p) => p.type === property.type && p.district !== property.district);
  const otherType = others.filter((p) => p.type !== property.type);
  return [...sameTypeSameDistrict, ...sameTypeOtherDistrict, ...otherType].slice(0, limit);
};
