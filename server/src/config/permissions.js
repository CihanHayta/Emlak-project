// server/src/config/permissions.js
//
// Tek doğruluk kaynağı: rol bazlı taban izinler + owner'ın "Ayarlar >
// Yetkiler" sayfasından özelleştirebileceği izin kataloğu.
// `authorize.middleware.js` (gerçek uygulama) ve `tenant.service.js`
// (Yetkiler sayfasının okuma/yazması) ikisi de buradan besleniyor —
// birbirini import etmiyorlar, döngüsel bağımlılık olmasın diye.

// owner/admin HER ZAMAN "*" — Yetkiler sayfasından asla kısıtlanamaz
// (aksi halde owner kendi kendini kilitleyebilir). agent/assistant/viewer
// buradaki liste, tenant hiç özelleştirme yapmamışsa kullanılan VARSAYILAN.
export const BASE_PERMISSIONS = {
  owner: ["*"],
  admin: ["*"],
  agent: [
    "properties:read", "properties:write",
    "vehicles:read", "vehicles:write",
    "customers:read", "customers:write",
    "appointments:read", "appointments:write",
    "conversations:read", "conversations:write",
    "leads:read", "leads:write",
    "uploads:write",
  ],
  assistant: [
    "properties:read",
    "vehicles:read",
    "customers:read", "customers:write",
    "appointments:read", "appointments:write",
    "conversations:read", "conversations:write",
    "leads:read", "leads:write",
    "uploads:write",
  ],
  viewer: ["properties:read", "vehicles:read", "customers:read", "appointments:read", "leads:read"],
};

// Owner "Ayarlar > Yetkiler" sayfasından SADECE bu rollerin izinlerini
// özelleştirebilir — owner/admin hep "*" kalır, `viewer` bugün hiçbir
// yerden atanamadığı için (bkz. userStore.js#ASSIGNABLE_ROLES) listeye
// alınmadı.
export const CUSTOMIZABLE_ROLES = ["agent", "assistant"];

// Owner'ın verebileceği izinlerin TAM listesi — "tenant:manage"/"users:*"
// BİLEREK burada YOK: entegrasyon bağlama ve kullanıcı yönetimi her zaman
// owner/admin'e özel kalmalı, Yetkiler sayfasından asla açılamamalı.
export const PERMISSION_CATALOG = [
  "properties:read", "properties:write",
  "vehicles:read", "vehicles:write",
  "customers:read", "customers:write",
  "appointments:read", "appointments:write",
  "conversations:read", "conversations:write",
  "leads:read", "leads:write",
  "uploads:write",
];
