// server/src/config/env.js
import dotenv from "dotenv";

dotenv.config();

const ALWAYS_REQUIRED = ["NODE_ENV", "PORT", "FIREBASE_MODE", "INTEGRATIONS_MODE", "CORS_ORIGINS"];

const REQUIRED_WHEN_FIREBASE_LIVE = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_STORAGE_BUCKET",
];

// WhatsApp değişkenleri BİLEREK bu listede değil — kod tarafında henüz
// hiçbir WhatsApp entegrasyonu (webhook/servis) yok, olmayan bir özellik
// için zorunlu env değişkeni istemenin anlamı yok. WhatsApp Business API
// bağlanınca (bkz. docs/ARCHITECTURE.md) WHATSAPP_* buraya geri eklenir.
const REQUIRED_WHEN_INTEGRATIONS_LIVE = [
  "INSTAGRAM_APP_SECRET",
  "INSTAGRAM_VERIFY_TOKEN",
  "INSTAGRAM_ACCESS_TOKEN",
];

function missingFrom(keys) {
  return keys.filter((key) => !process.env[key] || process.env[key].trim() === "");
}

function collectMissingVars() {
  const missing = new Set(missingFrom(ALWAYS_REQUIRED));
  if (process.env.FIREBASE_MODE === "live") {
    missingFrom(REQUIRED_WHEN_FIREBASE_LIVE).forEach((key) => missing.add(key));
  }
  if (process.env.INTEGRATIONS_MODE === "live") {
    missingFrom(REQUIRED_WHEN_INTEGRATIONS_LIVE).forEach((key) => missing.add(key));
  }
  return [...missing];
}

// Boot'ta ilk iş: eksik zorunlu değişken varsa açıklayıcı bir mesajla dur.
// "Neden çöktüğünü anlamadım" yaşamamak için — server.js'in en başında import edilir.
const missingVars = collectMissingVars();
if (missingVars.length > 0) {
  console.error(
    [
      "\n[env] Uygulama başlatılamadı — eksik/boş ortam değişkeni(leri) var:",
      ...missingVars.map((key) => `  - ${key}`),
      "\nÇözüm: server/.env dosyasını server/.env.example ile karşılaştırıp eksikleri doldurun.",
      "Not: FIREBASE_MODE=live ve INTEGRATIONS_MODE=live iken ek değişkenler zorunlu olur — .env.example'daki açıklamalara bakın.\n",
    ].join("\n"),
  );
  process.exit(1);
}

function requireEnum(key, allowed) {
  const value = process.env[key];
  if (!allowed.includes(value)) {
    console.error(`\n[env] ${key} değeri "${value}" geçersiz — şunlardan biri olmalı: ${allowed.join(" | ")}\n`);
    process.exit(1);
  }
  return value;
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0) {
  console.error(`\n[env] PORT sayısal bir değer olmalı, alınan: "${process.env.PORT}"\n`);
  process.exit(1);
}

/**
 * Tek doğru kaynak: kodun geri kalanı process.env'e değil buraya baksın.
 * Böylece tipi/varsayılanı bir kere burada tanımlarız, her yerde tekrar etmeyiz.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === "production",
  port,

  firebaseMode: requireEnum("FIREBASE_MODE", ["mock", "live"]),
  integrationsMode: requireEnum("INTEGRATIONS_MODE", ["mock", "live"]),

  corsOrigins: process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || null,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || null,
    // .env dosyasında \n olarak yazılan satır sonlarını gerçek satır sonuna çeviriyoruz —
    // Firebase servis hesabı private key'i PEM formatında çok satırlı gelir.
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : null,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
  },

  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || null,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || null,
    appSecret: process.env.WHATSAPP_APP_SECRET || null,
  },
  instagram: {
    appSecret: process.env.INSTAGRAM_APP_SECRET || null,
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || null,
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || null,
  },
  metaGraphApiVersion: process.env.META_GRAPH_API_VERSION || "v21.0",

  logLevel: process.env.LOG_LEVEL || "info",

  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || "session",
    // "Beni Hatırla" işaretliyse: Firebase session cookie'sinin izin verdiği
    // tavan (14 gün) kullanılır. İşaretlenmezse kısa bir süre (1 gün) —
    // tarayıcıda KALICI olup olmaması ayrı bir konu, ona auth.controller.js
    // cookie'ye maxAge verip vermeyerek karar verir.
    rememberExpiryDays: Number(process.env.SESSION_COOKIE_REMEMBER_DAYS) || 14,
    defaultExpiryDays: Number(process.env.SESSION_COOKIE_DEFAULT_DAYS) || 1,
  },

  signedUrlExpirySeconds: Number(process.env.SIGNED_URL_EXPIRY_SECONDS) || 900,
};
