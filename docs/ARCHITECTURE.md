# ARCHITECTURE.md — Mimari, Veri Akışı ve Teknik Kararlar

> İş modeli (her kararın temeli): Bu proje çok kiracılı bir SaaS DEĞİL.
> **Tek kiracılı, satış başına ayrı bir Firebase projesine kurulan** bir
> üründür. Kod tabanı (bu repo) her müşteride aynı kalır, değişen tek şey
> `.env` dosyaları ve `src/firebase/config.js`'in okuduğu değerlerdir. Kod
> içindeki `tenantId` alanları/izolasyonu yine de var ve zararsız — artık
> "aynı projede birden fazla firma" için değil, gelecekte gerekirse diye.

## Genel Mimari

```
┌─────────────────┐     HTTPS      ┌──────────────────┐     Admin SDK     ┌───────────┐
│  Public Site +   │ ─────────────▶ │   Express API     │ ────────────────▶ │ Firestore  │
│  Admin Panel      │  fetch()      │   (server/)        │                    │ + Storage  │
│  (React/Vite)     │ ◀───────────── │   /api/v1/*        │ ◀──────────────── │ + Auth     │
└─────────────────┘   JSON zarfı    └──────────────────┘                    └───────────┘
       │                                      ▲
       │ Firebase Auth (sadece giriş,         │
       │ idToken üretimi için)                │ verifyIdToken/
       ▼                                      │ createSessionCookie
┌─────────────────┐                           │
│  Firebase Auth    │ ──────────────────────────┘
│  (client SDK)      │
└─────────────────┘
```

Frontend **hiçbir zaman** Firestore/Storage'a doğrudan dokunmaz — sadece
giriş yaparken Firebase Auth'un client SDK'sını kullanır (idToken almak
için), o idToken'ı backend'e gönderir, backend onu bir httpOnly session
cookie'ye çevirir. Ondan sonraki HER İSTEK (müşteri listesi, ilan
oluşturma, dosya yükleme...) backend üzerinden gider. Bkz. `SECURITY.md`
neden bunun bilinçli bir tercih olduğu için.

## Katmanlar (backend)

```
routes → controllers → services → repositories → firebase/ (Admin SDK)
```

- **routes/**: hangi middleware zincirinden (auth → tenant → authorize)
  geçeceğini tanımlar, iş kuralı içermez.
- **controllers/**: req/res ↔ servis çevirisi, iş kuralı içermez.
- **services/**: framework'ten bağımsız iş kuralları (örn. "depolama
  kotasını aştın mı").
- **repositories/**: Firestore sorgu inşası, tenant izolasyonu burada
  yapısal olarak zorlanır (bkz. aşağıdaki `BaseRepository`).

Bu tek yönlü bağımlılık bilinçli: bir controller'ın doğrudan Firestore'a
dokunması ya da bir repository'nin bir HTTP kavramı (req/res) bilmesi
mimari olarak "olmaması gereken" bir şey.

## Oluşturulan Dosyalar — Backend (`server/`)

```
server/
├── scripts/
│   ├── bootstrap-owner.js       # Tek seferlik: ilk owner + tenant oluşturur
│   └── migrate-properties.js    # Tek seferlik: örnek ilanları Firestore'a yazar
├── src/
│   ├── app.js                   # Express app: helmet/cors/compression/rate-limit zinciri
│   ├── server.js                # http sunucusu + graceful shutdown
│   ├── config/
│   │   ├── env.js               # .env doğrulama + tek merkezi config objesi
│   │   ├── constants.js         # ROLES, ERROR_CODES, RATE_LIMITS, UPLOAD_LIMITS
│   │   └── logger.js            # winston, hassas alanları maskeler
│   ├── firebase/
│   │   ├── admin.js             # Admin SDK lazy singleton (TEK initializeApp noktası)
│   │   ├── firestore.client.js  # mock/live seçim noktası (Firestore)
│   │   ├── storage.client.js    # mock/live seçim noktası (Storage)
│   │   ├── auth.client.js       # mock/live seçim noktası (Auth)
│   │   └── mock/                # Bellek/disk tabanlı sahte Firestore + Storage
│   ├── middleware/               # requestId, auth, tenant, authorize, rateLimit, upload, validate, error, notFound
│   ├── models/                   # base, tenant, user, customer, lead, appointment, property
│   ├── repositories/             # BaseRepository + her domain için bir repository
│   ├── services/                 # İş kuralları
│   ├── controllers/               # req/res ↔ servis çevirisi
│   ├── routes/                    # Express router'ları + index.js
│   └── utils/                     # ApiError, ApiResponse, pagination, phone, date, slugify, TenantScopeError
```

## Oluşturulan Dosyalar — Frontend (`src/`)

```
src/
├── firebase/                     # TEK Firebase yapılandırma noktası
│   ├── config.js                 # initializeApp — değişmesi gereken TEK dosya (+ .env)
│   ├── auth.js                   # getAuth(firebaseApp)
│   ├── firestore.js              # getFirestore(firebaseApp) — bugün kullanılmıyor, ileride için hazır
│   └── storage.js                # getStorage(firebaseApp) — bugün kullanılmıyor, ileride için hazır
├── lib/
│   ├── apiClient.js               # fetch wrapper: credentials:include + hata zarfı çözümleme
│   ├── firestoreTimestamp.js      # toMillis() — bkz. aşağıdaki "Timestamp Tuzağı"
│   ├── leadStore.js                # Public + admin başvuru store'u
│   └── mediaStore.js               # Dosya yükleme — backend'in /uploads uçlarına gerçek POST
├── data/
│   └── properties.js               # Public ilan store'u (/public/properties'ten besleniyor)
├── hooks/
│   └── usePropertiesVersion.js     # İlan verisi async geldiğinde component'leri yeniden render ettiren hook
├── admin/
│   ├── data/
│   │   ├── customerStore.js, appointmentStore.js, listingStore.js, userStore.js  # apiClient tabanlı
│   │   └── settingsStore.js        # Sadece "Yetkiler" sekmesi için (hâlâ yerel/kozmetik)
│   └── lib/
│       ├── auth.js                 # login/logout/subscribeToAuthState
│       ├── playSound.js            # Web Audio API ile sentetik bildirim sesleri
│       └── useIncomingLeadAlerts.js # 20sn'de bir başvuru kontrolü + ses/bildirim
```

## Firebase Nasıl Initialize Edildi

**Backend (`server/src/firebase/admin.js`):** Tembel (lazy) singleton —
sadece `FIREBASE_MODE=live` iken ve ilk gerçek çağrıda `admin.initializeApp()`
çalışır, mock modda hiç yüklenmez. Kimlik bilgisi `FIREBASE_PROJECT_ID` +
`FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` env değişkenlerinden
(`admin.credential.cert(...)`) okunur.

**Frontend (`src/firebase/config.js`):**
```js
import { initializeApp } from "firebase/app";
export const firebaseConfig = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, ... };
export const firebaseApp = initializeApp(firebaseConfig);
```
Frontend'de Firebase'in başlatıldığı **tek** yer burasıdır; `auth.js`/
`firestore.js`/`storage.js` bu `firebaseApp`'i alıp kendi servislerini
döndürür.

## Mock/Live Seçim Deseni (backend'e özgü)

`firestore.client.js`, `storage.client.js`, `auth.client.js` — her biri
`env.firebaseMode` değerine bakıp ya `mock/` altındaki sahte
implementasyonu ya da gerçek Admin SDK'yı döndürür. Üst katmanlar
(`repositories/`, `services/`) hangisinin aktif olduğunu **hiç bilmez**,
sadece `getFirestore()`/`getStorageClient()`/`getAuthClient()` çağırır.
Bu sayede:
- Geliştirme/test **Firebase'e hiç bağlanmadan** (`FIREBASE_MODE=mock`) yapılabilir.
- Gerçek Firebase'e geçiş `.env`'de tek satır (`FIREBASE_MODE=live`) değiştirmekten ibarettir.

## Tenant İzolasyonu — `BaseRepository`

`tenants` ve `users` DIŞINDAKİ her koleksiyon repository'si `BaseRepository`'yi
extend eder. `#collection` bir **private class field** olduğu için alt
sınıflar bile ona doğrudan erişemez — tek yol `scopedQuery`/`scopedDocRef`
gibi metotlardır, hepsi `context.tenantId` olmadan çalışmayı reddeder
(`TenantScopeError` fırlatır). Bu, "tenantId filtresini unuttum" hatasının
kod seviyesinde imkânsız olması demektir — bir konvansiyon değil, JS
dilinin private field garantisiyle zorlanan bir kural.

## Frontend Veri Deseni ("cache+subscribe")

Neredeyse her `*Store.js` dosyası (customerStore, appointmentStore,
listingStore, properties.js...) **aynı** deseni kullanır:

```js
let cache = [];
let loadPromise = null;
const listeners = new Set();

function ensureLoaded() { if (!loadPromise) loadPromise = refresh(); return loadPromise; }
export function getX() { ensureLoaded(); return cache; }                      // SENKRON okuma
export async function addX(data) { ... await apiClient.post ...; notify(); }  // ASENKRON yazma
export function subscribeToX(cb) { listeners.add(cb); return unsubscribe; }
```

**Neden böyle:** Okuma fonksiyonları senkron kalıyor (React component'leri
render sırasında direkt çağırabiliyor), ama veri aslında arka planda
asenkron geliyor. Bu yüzden **her component, veri geldiğinde yeniden
render olmak için `subscribeToX`'e abone olmalı**
(`useEffect(() => subscribeToX(callback), [])`). Bunu unutursanız, sayfa
ilk yüklemede boş görünüp bir daha güncellenmez — bu projede bu tam olarak
yaşandı (`PropertyDetail.jsx`'in kısa süreliğine "İlan Bulunamadı"
göstermesi) ve `usePropertiesVersion()` hook'uyla çözüldü.

## Firestore Timestamp Tuzağı

Backend'de `new Date()` ile yazılan alanlar (`createdAt`, `updatedAt`),
JSON üzerinden frontend'e `{_seconds, _nanoseconds}` şeklinde gelir — düz
bir sayı ya da ISO string DEĞİLDİR. Bunu sıralama/karşılaştırma için
kullanan her yerde `src/lib/firestoreTimestamp.js#toMillis()` ile normalize
etmeniz gerekir. (`appointments.dateTime` bu kuralın **istisnası** — o
bilerek düz epoch-ms sayı olarak tutuluyor, Timestamp değil.)

## Roller ve Yetkiler

3 sabit rol var, **dinamik/özel rol oluşturma yok** (bilinçli bir tercih —
tek firma + küçük ekip senaryosunda gereksiz karmaşıklık): `owner` (Admin,
sadece `bootstrap-owner.js` ile), `agent` (Danışman), `assistant`
(Personel). Frontend'de gösterilen Türkçe etiketler (`ROLE_LABELS`,
`src/admin/data/userStore.js`) ile backend'in İngilizce rol string'leri
(`server/src/middleware/authorize.middleware.js`) birbirine **elle
eşlenir** — biri değişirse diğeri de güncellenmeli. Ayrıntı: `SECURITY.md`.

## Veri Modeli / İlişkiler

Firestore'da gerçek "foreign key" yok — ilişkiler sadece **id referansı**
ile, uygulama katmanında çözülüyor:

- `appointments.customerId` → `customers/{id}`
- `appointments.listingId` → `properties/{id}` (opsiyonel)
- `customers.sellingListingId` → `properties/{id}`
- **Her şeyin** `tenantId` alanı → `tenants/{id}` (asıl "her şeyi
  birbirine bağlayan" alan budur)

Frontend'de bu referanslar **enrichment** ile çözülüyor — örn.
`appointmentStore.js`'in `withListing()` fonksiyonu, her randevuya
`getPropertyById(listingId)` sonucunu ekleyerek `.listing` alanı üretir;
bu backend'de değil, frontend cache'inde yapılıyor. Tam koleksiyon/doküman
şeması için bkz. `DATA-MODEL.md`.

## Bilinen Eksikler / Yapılmadı (dürüstçe)

- **Otomatik test yok.** Her doğrulama gerçek tarayıcı (Puppeteer) ve
  `curl` testleriyle elle yapıldı. Regresyona karşı bir güvenlik ağı yok.
- **Bildirim merkezi** (`notificationStore.js`, Bildirimler sayfası) hâlâ
  localStorage — cihazlar/kullanıcılar arası senkron değil. (Yeni-başvuru
  sesi/anlık uyarısı ayrı ve gerçek bir sistemdir, karıştırmayın.)
- **"Yetkiler" sekmesi** (Ayarlar sayfası) hâlâ kozmetik/yerel — gerçek
  RBAC ile bağlı değil.
- **Instagram/Facebook DM modülü** hiç başlanmadı — sıfırdan bir modül.
- **Restore işlemi** hiç test edilmedi (bkz. `BACKUP.md`).

## Bir Sonraki Adımı Nereden Bulurum?

`git log --oneline` — her commit mesajı, o değişikliğin **neden**
yapıldığını (sadece ne yapıldığını değil) anlatacak şekilde yazıldı.
Kronolojik olarak okumak, projenin nasıl bu hale geldiğini anlamanın en
hızlı yolu. Ayrıca bkz. `HISTORY.md`.
