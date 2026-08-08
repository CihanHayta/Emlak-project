// server/src/config/constants.js
// Cross-cutting sabitler — sonraki fazlarda (properties/customers/appointments)
// domain'e özel enum'lar kendi service/model dosyalarında, frontend'in
// gerçek değerleriyle birebir eşleşecek şekilde tanımlanacak (bkz.
// docs/backend/faz0-frontend-envanteri.md — CUSTOMER_STATUSES, LEAD_SOURCES vb.
// zaten frontend'de var, burada tekrar edip iki yerden yönetmeyeceğiz).

// Her ofis içindeki kullanıcı rolü. tenantId+role Firebase custom claims'te
// tutulur (bkz. middleware/auth.middleware.js, middleware/tenant.middleware.js).
export const ROLES = ["owner", "admin", "agent", "assistant", "viewer"];

// API hata sözleşmesi: { success:false, error:{ code, message, details, requestId } }
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  TENANT_QUOTA_EXCEEDED: "TENANT_QUOTA_EXCEEDED",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

// Her hata kodunun döneceği HTTP durum kodu — ApiError bunu kullanır.
export const ERROR_STATUS = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.UNAUTHENTICATED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 413,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.TENANT_QUOTA_EXCEEDED]: 402,
  [ERROR_CODES.UPSTREAM_ERROR]: 502,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const RATE_LIMITS = {
  GLOBAL: { windowMs: 15 * 60 * 1000, max: 300 },
  AUTH: { windowMs: 15 * 60 * 1000, max: 20 },
  WEBHOOK: { windowMs: 60 * 1000, max: 1000 },
};

export const UPLOAD_LIMITS = {
  image: { maxSizeBytes: 10 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
  video: { maxSizeBytes: 200 * 1024 * 1024, mimeTypes: ["video/mp4", "video/quicktime"] },
  // Araç ekspertiz raporu/servis-tramer-garanti belgeleri gibi kullanımlar
  // için BİLEREK sadece PDF — "sadece PDF yüklenebilsin, başka dosya türü
  // reddedilsin" gereksinimi burada, backend seviyesinde uygulanıyor
  // (frontend'in accept="application/pdf"'i sadece kozmetik bir yardımcı,
  // asıl güvence burası — bkz. upload.middleware.js'in fileFilter'ı).
  document: { maxSizeBytes: 10 * 1024 * 1024, mimeTypes: ["application/pdf"] },
};
