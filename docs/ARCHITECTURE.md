# ARCHITECTURE.md — Mimari, Veri Akışı ve Teknik Kararlar

> İş modeli (her kararın temeli): **Tek kiracılı**. Bir müşteriye bir
> deployment — kendi backend süreci (Railway), kendi PostgreSQL veritabanı,
> kendi Cloudflare R2 bucket'ı. Kod tabanı aynı kalır, değişen sadece
> `server/.env` (`DATABASE_URL`, `R2_*`) ve `.env` (`VITE_TENANT_ID`).
> Firebase'e (Firestore/Storage/Authentication) hiçbir bağımlılık yok — proje
> daha önce (bkz. `HISTORY.md`) Firestore+Firebase Storage+Firebase Auth
> kullanıyordu, hepsi sırayla Postgres/R2/Postgres-native oturuma taşındı.
>
> **Neden bu mimari (az servis / az bakım / performans / sürdürülebilirlik):**
> Tek bir Postgres veritabanı hem gerçek sorgulama/filtreleme/sıralama/
> pagination hem de gerçek transaction/foreign-key garantisi verir (object
> storage'ın — R2'nin — asla veremeyeceği şeyler); R2 sadece kendi işini
> yapar (dosya). Ayrı bir "kimlik doğrulama servisi" (Firebase Auth, Auth0,
> Better Auth vb.) yok — bcrypt + kendi `sessions` tablosu, bu ölçekte
> (tek ofis, bir avuç kullanıcı) yeterli ve tek bir dış bağımlılık daha az.
>
> Yeni müşteri ekleme adımları için bkz. `INSTALL.md`.

## Genel Mimari

```
┌──────────────────┐     HTTPS      ┌───────────────────┐
│  Public Site +    │ ─────────────▶ │   Express API      │
│  Admin Panel       │  fetch()       │   (server/)         │
│  (React/Vite)       │ ◀───────────── │   /api/v1/*          │
└──────────────────┘   JSON zarfı    └───────────────────┘
                                          │        │        │
                                          ▼        ▼        ▼
                                    ┌─────────┐┌───────┐┌──────────┐
                                    │Postgres  ││  R2    ││ WhatsApp/ │
                                    │(iş verisi││(dosya  ││ Instagram │
                                    │+ kullanıcı│ storage)││ (Meta API)│
                                    │+ oturum) │└───────┘└──────────┘
                                    └─────────┘
```

Frontend backend DIŞINDA hiçbir şeye doğrudan bağlanmaz — ne Postgres'e, ne
R2'ye, ne Meta API'sine. Giriş dahil HER İSTEK `/api/v1/*` üzerinden gider;
backend e-posta+şifreyi doğrular, bir httpOnly oturum çerezi döner. Bkz.
`SECURITY.md`.

## Katmanlar (backend)

```
routes → controllers → services → repositories → db/ (Postgres pool / R2 istemcisi)
```

- **routes/**: hangi middleware zincirinden (auth → tenant → authorize)
  geçeceğini tanımlar, iş kuralı içermez.
- **controllers/**: req/res ↔ servis çevirisi, iş kuralı içermez.
- **services/**: framework'ten bağımsız iş kuralları (örn. "depolama
  kotasını aştın mı", "şifre en az 6 karakter mi").
- **repositories/**: SQL sorgu inşası, tenant izolasyonu burada yapısal
  olarak zorlanır (bkz. aşağıdaki `BasePostgresRepository`).

Bu tek yönlü bağımlılık ESLint ile de zorlanıyor (bkz. `server/.eslintrc.json`
`no-restricted-imports`): bir controller doğrudan bir repository'ye
dokunamaz, bir repository bir service'i import edemez.

## Oluşturulan Dosyalar — Backend (`server/`)

```
server/
├── scripts/
│   ├── bootstrap-owner.js         # İlk owner+tenant'ı oluşturur; aynı e-postayla
│   │                               # tekrar çalıştırılırsa owner şifresini SIFIRLAR
│   ├── create-launch-funnel.js    # Tek seferlik: ilk kampanya funnel'ını oluşturur
│   ├── migrate.js                 # migrations/'ı DATABASE_URL'e uygular (db:migrate)
│   ├── test-r2-connection.js      # R2 bağlantısını izole test eder
│   └── test-upload-flow.js        # Presigned upload akışını gerçek Postgres+R2'ye karşı test eder
├── migrations/                    # node-pg-migrate şema geçmişi (bkz. DATA-MODEL.md)
├── src/
│   ├── app.js                     # Express app: helmet/cors/compression/rate-limit zinciri
│   ├── server.js                  # http sunucusu + graceful shutdown + arka plan job'ları
│   ├── config/
│   │   ├── env.js                 # .env doğrulama + tek merkezi config objesi
│   │   ├── constants.js           # ROLES, ERROR_CODES, RATE_LIMITS, UPLOAD_LIMITS
│   │   ├── permissions.js         # BASE_PERMISSIONS, CUSTOMIZABLE_ROLES, PERMISSION_CATALOG
│   │   └── logger.js              # winston, hassas alanları maskeler
│   ├── db/
│   │   ├── pool.js                # Postgres bağlantı havuzu (lazy singleton)
│   │   ├── storage.client.js      # mock/live seçim noktası (R2)
│   │   ├── caseMapper.js          # snake_case (SQL) ↔ camelCase (JS) çevirisi
│   │   └── mock/storage.mock.js   # STORAGE_MODE=mock iken diske yazan sahte R2
│   ├── middleware/                 # requestId, auth, tenant, authorize, rateLimit, upload, validate, error, notFound
│   ├── models/                     # base, tenant, user, customer, lead, appointment, property, vehicle, funnel, ...
│   ├── repositories/                # BasePostgresRepository + her domain için bir *.postgres.repository.js
│   ├── services/                    # İş kuralları (auth.service.js dahil)
│   ├── controllers/                 # req/res ↔ servis çevirisi
│   ├── routes/                      # Express router'ları + index.js
│   ├── jobs/                        # Zamanlanmış arka plan işleri (randevu hatırlatma, otomasyon uyarıları, token yenileme)
│   ├── webhook/                     # WhatsApp/Instagram/Meta Lead Ads webhook uçları
│   └── utils/                       # ApiError, ApiResponse, password.util.js, session.util.js, email.util.js, pagination, phone, date, slugify
```

## Oluşturulan Dosyalar — Frontend (`src/`)

```
src/
├── lib/
│   ├── apiClient.js               # fetch wrapper: credentials:include + hata zarfı çözümleme
│   ├── firestoreTimestamp.js      # toMillis() — bkz. aşağıdaki "İsim kalıntısı" notu
│   ├── leadStore.js                # Public + admin başvuru store'u
│   └── mediaStore.js               # Dosya yükleme — backend'in presigned upload akışına gider
├── data/
│   └── properties.js               # Public ilan store'u (/public/properties'ten besleniyor)
├── hooks/
│   └── usePropertiesVersion.js     # İlan verisi async geldiğinde component'leri yeniden render ettiren hook
├── admin/
│   ├── data/
│   │   ├── customerStore.js, appointmentStore.js, listingStore.js, userStore.js, vehicleStore.js, ...  # apiClient tabanlı
│   │   └── settingsStore.js        # Sadece "Yetkiler" sekmesi için (hâlâ yerel/kozmetik)
│   └── lib/
│       ├── auth.js                 # login/logout/subscribeToAuthState — backend'in oturum çerezine bağlı
│       ├── playSound.js            # Web Audio API ile sentetik bildirim sesleri
│       └── useIncomingLeadAlerts.js # Periyodik başvuru kontrolü + ses/bildirim
```

Not: `src/firebase/` klasörü artık YOK — Firebase Authentication kaldırıldı
(bkz. `HISTORY.md`), giriş tamamen `admin/lib/auth.js` üzerinden backend'e
gider.

## Kimlik Doğrulama Nasıl Çalışıyor

**Backend (`server/src/services/auth.service.js`):**
- `login(email, password)`: e-posta normalize edilir (küçük harf), Postgres'ten
  `password_hash` çekilir, `bcryptjs` ile karşılaştırılır. Doğruysa
  32 bayt rastgele bir token üretilir, SHA-256 hash'i `sessions` tablosuna
  yazılır, HAM token çağırana (→ çereze) döner.
- `verifySessionToken(token)`: token'ın hash'i `sessions`'ta aranır
  (`revoked_at IS NULL AND expires_at > now()`), bulunursa `users`
  tablosundan CANLI satır (role/status/tenantId) okunur. Bu, Firebase
  custom claims'ten FARKLI olarak bir rol değişikliğinin/hesabı pasife
  almanın açık oturumlarda bile ANINDA etkili olması demek.
- `logout(token)`: sadece o token'ın oturumunu iptal eder (diğer
  cihazlardaki oturumlara dokunmaz). Şifre değiştiğinde/hesap pasife
  alındığında/silindiğinde ise TÜM oturumları iptal eder (bkz.
  `user.postgres.service.js`).

**Frontend (`src/admin/lib/auth.js`):** `login()` doğrudan
`POST /auth/login` (e-posta+şifre) çağırır, backend httpOnly bir çerez
döner, ardından `GET /auth/me` gerçek kaynak olarak okunur — tarayıcı
tarafında hiçbir token/şifre tutulmaz, sadece `credentials:"include"` ile
çerez otomatik gider.

**İlk hesap:** Kendi kendine kayıt YOK. `node scripts/bootstrap-owner.js
<email> <şifre>` ilk owner+tenant'ı oluşturur; aynı e-postayla tekrar
çalıştırılırsa o hesabın şifresini SIFIRLAR (owner kendi şifresini
unutursa kullanılacak yol budur). Danışman/Personel/Kısıtlı hesapları
owner, Ayarlar sayfasından açar/siler/şifresini değiştirir.

## Tenant İzolasyonu — `BasePostgresRepository`

Her domain repository'si `BasePostgresRepository`'yi extend eder.
`context.tenantId` olmadan hiçbir sorgu kurulamaz (`#assertTenantId`,
`TenantScopeError` fırlatır) — bu bir konvansiyon değil, her metodun
girişinde zorlanan bir kural. Her sorgu `WHERE tenant_id = $N` içerir; bu
tek-kiracılı mimaride mutlak bir güvenlik sınırı değil (zaten tek tenant
var), ama "yanlış context geçirildi" sınıfı bir kod hatasını erken
yakalayan bir kanarya sütunudur.

`users` tek gerçek istisna: hard-delete kullanır (soft-delete `deleted_at`
sütunu var ama pratikte hep NULL kalır) çünkü bir kullanıcı silindiğinde
ilişkili `sessions` satırları da (FK `ON DELETE CASCADE` ile) anında,
kalıcı olarak silinmeli — "silinmiş ama hâlâ oturumu geçerli" durumu
olmamalı.

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
ilk yüklemede boş görünüp bir daha güncellenmez.

## `firestoreTimestamp.js` — isim kalıntısı, davranış sorunu değil

`src/lib/firestoreTimestamp.js#toMillis()` adını Firestore döneminden
alıyor (o zaman `createdAt`/`updatedAt` `{_seconds,_nanoseconds}` şeklinde
geliyordu) ama fonksiyonun kendisi savunmacı/genel: sayı, `{_seconds,...}`
ya da (bugün API'nin gerçekten döndürdüğü) ISO string/epoch — hepsini
doğru şekilde epoch-ms'e çevirir. Postgres artık `TIMESTAMPTZ`/`BIGINT`
kullandığı için `{_seconds,...}` dalı fiilen hiç tetiklenmiyor ama
zararsız — yeniden adlandırmak/silmek bu geçişin kapsamı dışında bırakıldı.

## Roller ve Yetkiler

5 sabit rol var, **dinamik/özel rol oluşturma yok** (bilinçli bir tercih —
tek firma + küçük ekip senaryosunda gereksiz karmaşıklık): `owner` (Admin,
sadece `bootstrap-owner.js` ile), `admin` (owner ile aynı yetkiye sahip,
Ayarlar'dan atanamaz), `agent` (Danışman), `assistant` (Personel), `viewer`
(Kısıtlı). Frontend'de gösterilen Türkçe etiketler (`ROLE_LABELS`,
`src/admin/data/userStore.js`) ile backend'in İngilizce rol string'leri
(`server/src/config/permissions.js`) birbirine **elle eşlenir** — biri
değişirse diğeri de güncellenmeli. Ayrıntı: `SECURITY.md`.

## Veri Modeli / İlişkiler

Postgres'te GERÇEK foreign key'ler var (Firestore döneminden farklı):

- `appointments.customer_id` → `customers(id)` (`ON DELETE SET NULL`)
- `appointments.listing_id` → `properties(id)` (opsiyonel, `ON DELETE SET NULL`)
- `customers.selling_listing_id` → `properties(id)` (`ON DELETE SET NULL`)
- `property_media.property_id` → `properties(id)` (`ON DELETE CASCADE`)
- `vehicle_media.vehicle_id` → `vehicles(id)` (`ON DELETE CASCADE`)
- `sessions.user_id` → `users(id)` (`ON DELETE CASCADE`)
- **Her tablonun** `tenant_id` alanı (asıl "her şeyi birbirine bağlayan" alan budur)

Frontend'de bu referanslar **enrichment** ile de çözülüyor — örn.
`appointmentStore.js`'in `withListing()` fonksiyonu, her randevuya
`getPropertyById(listingId)` sonucunu ekleyerek `.listing` alanı üretir;
bu backend'de değil, frontend cache'inde yapılıyor. Tam şema için bkz.
`DATA-MODEL.md`.

## Bilinen Eksikler / Yapılmadı (dürüstçe)

- **Bildirim merkezi** (`notificationStore.js`, Bildirimler sayfası) hâlâ
  localStorage — cihazlar/kullanıcılar arası senkron değil. (Yeni-başvuru
  sesi/anlık uyarısı ayrı ve gerçek bir sistemdir, karıştırmayın.)
- **"Yetkiler" sekmesi** (Ayarlar sayfası) hâlâ kozmetik/yerel — gerçek
  RBAC ile bağlı değil.
- **R2 dosyaları için otomatik yedekleme/versioning kurulmadı** (bkz.
  `BACKUP.md`) — bilinen bir eksik.
- **Self-servis e-posta ile "şifremi unuttum" akışı yok** — bilinçli bir
  tercih (bkz. `SECURITY.md`), ayrı bir SMTP altyapısı kurmak yerine
  `bootstrap-owner.js`'in yeniden çalıştırılması tercih edildi.
- **Otomatik/self-servis tenant provisioning yok** — yeni bir tenant açmak
  hâlâ elle `node scripts/bootstrap-owner.js` çalıştırmayı gerektiriyor,
  admin panelden veya bir API uçtan yapılamıyor.

## Bir Sonraki Adımı Nereden Bulurum?

`git log --oneline` — her commit mesajı, o değişikliğin **neden**
yapıldığını (sadece ne yapıldığını değil) anlatacak şekilde yazıldı.
Kronolojik olarak okumak, projenin nasıl bu hale geldiğini anlamanın en
hızlı yolu. Ayrıca bkz. `HISTORY.md`.
