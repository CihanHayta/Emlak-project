# CLAUDE.md — backend/

Bu dosya `backend/CLAUDE.md` olarak kaydedilir. Kök dizindeki `CLAUDE.md`'yi (mimari, güvenlik, multi-tenant genel kuralları) tamamlar — oradaki kurallar tekrar edilmez.

## Stack

- Node.js + Express + TypeScript (strict mode)
- **Veritabanı: Firestore** (Native mode) — Admin SDK üzerinden erişilir
- **Dosya depolama: Firebase Storage** (video, fotoğraf, PDF)
- Auth: JWT (access + refresh token); Firestore/Storage erişimi Admin SDK ile yapıldığı için Firebase Auth şart değil, mevcut JWT sistemi korunur
- Entegrasyon: Meta (Instagram/Facebook) mesaj webhook'ları

## Firestore Koleksiyon Yapısı

Multi-tenant izolasyonu **yapısal** olarak sağlanır: her firma verisi `companies/{companyId}` altında subcollection olarak tutulur. Bu sayede "companyId filtresini unuttum" hatası mimari olarak imkansız hale gelir — sorgu yolunun kendisi zaten o firmaya kilitlidir.

```
companies/{companyId}                        # firma ayarları (doc alanları: name, plan, meta ayarları vb.)
├── listings/{listingId}                       # ilanlar
├── customers/{customerId}                     # müşteri kartları
├── appointments/{appointmentId}                # randevular
└── conversations/{conversationId}
    └── messages/{messageId}                    # mesajlar (thread bazlı subcollection)
```

- `companySettings` ayrı bir koleksiyon değil, `companies/{companyId}` dokümanının alanlarıdır (veya gerekirse `companies/{companyId}/settings/config` tek doküman).
- Yeni bir modül eklerken önce bu yapıyı kullan — üst seviyede ayrı, companyId'siz bir koleksiyon açma.

## Katmanlar

```
Controller → Middleware → Service → Repository (Firestore) → Firestore/Storage
```

- Controller: Request → Service → Response akışını yönetir, business logic içermez.
- Service: iş kurallarını içerir (ör. randevu çakışma kontrolü, ilan durum geçişi).
- Repository: Firestore collection/doc erişiminden sorumlu tek katman. Controller veya Service hiçbir zaman `db.collection(...)`'a doğrudan erişmez.

## Dosya Yapısı

```
modules/
├── listings/
│   ├── listing.controller.ts
│   ├── listing.service.ts
│   ├── listing.repository.ts     # companies/{companyId}/listings erişimi burada
│   ├── listing.routes.ts
│   ├── listing.validation.ts
│   ├── listing.types.ts
│   └── listing.constants.ts
├── customers/
├── appointments/
├── messaging/          # Meta webhook + conversations/messages
└── media/               # Firebase Storage upload/delete işlemleri
```

## Route Kuralları ve Response Standardı

REST standartlarına uy, endpoint isminde fiil kullanma (`/api/listings`, `/api/customers` — `/api/getListings` değil).

```ts
// Başarılı
{ success: true, data: {}, error: null }
// Hata
{ success: false, data: null, error: { code: "...", message: "..." } }
```

## Firestore Erişim Kuralları

- Admin SDK tek bir yerde initialize edilir (`src/config/firebase.ts`), her modülde tekrar initialize edilmez.
- **Frontend Firestore'a asla doğrudan bağlanmaz** — tüm erişim backend API üzerinden. Firestore Security Rules bu yüzden `allow read, write: if false` şeklinde kapalı tutulur (client key sızarsa diye savunma amaçlı).
- Repository katmanında her okuma/yazma `companies/{companyId}/...` yolu üzerinden yapılır; `companyId` JWT'den gelir, asla parametre/body'den güvenilmez.
- Denormalizasyon kaçınılmazdır (JOIN yok): örn. randevu dokümanında `customerName`, `customerPhone` gibi sık okunan alanlar müşteri dokümanından kopyalanarak tutulur. Kaynak veri değiştiğinde bu kopyaları güncelleyen bir servis fonksiyonu (`syncCustomerDenormalizedFields`) yazılır — sessizce eskimeye bırakılmaz.
- Composite index'ler `firestore.indexes.json` dosyasında tutulur ve `firebase deploy --only firestore:indexes` ile deploy edilir. Firestore konsolu eksik index için hata linki verir — bu linkten üretilen index'i doğrudan JSON'a ekle.
- Transaction (`runTransaction`) sadece aynı işlemde okuma+yazma gereken kritik akışlarda kullanılır (ör. randevu çakışma kontrolü: aynı transaction içinde slot'u oku, boşsa yaz). Firestore transaction'ları tek bir tutarlılık sınırı içindir, Postgres'teki gibi serbest çoklu tablo transaction'ı değildir.
- Batched write (`writeBatch`) 500 işlem sınırını aşamaz — toplu güncellemelerde bu sınıra göre parçala.

## Maliyet ve Performans (Firestore okuma/yazma başına ücretlendirilir)

- Döngü içinde tek tek `.get()` çağırma (N+1 okuma) — mümkünse `in` sorgusu veya toplu `getAll()` kullan.
- Gereksiz `onSnapshot` (real-time listener) açma — her değişiklikte maliyet oluşturur, sadece gerçekten canlı güncelleme gereken yerde (ör. mesajlaşma) kullan.
- Liste sayfalarında `limit()` + `startAfter()` (cursor pagination) kullan, tüm koleksiyonu çekme.
- Sık okunan ama az değişen veriler (ör. firma ayarları) backend içinde kısa süreli cache'lenebilir.

## Arama ve Konum Sorguları (Firestore'un native desteklemediği alanlar)

- **Full-text search**: Firestore native full-text/Türkçe arama desteklemez. İlan/müşteri aramaları için Algolia, Typesense veya Meilisearch gibi harici bir arama servisi kullanılır; Firestore'a her yazımda (`onCreate`/`onUpdate`/`onDelete` veya backend service katmanında) arama index'ine senkron güncelleme yapılır.
- **Konum bazlı arama**: Firestore native geo-radius sorgusu desteklemez. `geofirestore` (geohash tabanlı) kütüphanesi veya manuel geohash alanı + bounding-box sorgusu kullanılır.
- Bu iki entegrasyon henüz kurulmadıysa, ilan/müşteri arama endpoint'i geçici olarak Firestore'un temel `where`/`orderBy` sorgularıyla sınırlı kalır — Claude bunu bilerek "tam metin arama" gibi native olmayan bir şey varsayıp kod yazmamalı.

## Randevu, Mesajlaşma, Müşteri Domain Kuralları

- Randevu çakışma kontrolü: aynı çalışan + aynı saat aralığı transaction içinde kontrol edilir.
- Müşteri kişisel verileri (telefon, e-posta) KVKK kapsamındadır: silme talebi geldiğinde ilgili doküman ve ona bağlı denormalize kopyalar (randevu, mesaj içindeki isim/telefon) birlikte ele alınmalı — sadece ana dokümanı silmek yeterli değildir.
- Meta webhook: doğrulama ayrı route'ta yapılır, event'ler idempotent işlenir (aynı event iki kez Firestore'a yazılmaz — `messageId` gibi bir alanla dedup kontrolü), webhook içinde ağır işlem yapılmaz, uzun işlemler (mesaj işleme, bildirim) queue'ya devredilir.
- Mesajlaşma real-time olmalıysa (ör. panelde anlık mesaj akışı): backend `onSnapshot` dinleyip WebSocket/SSE ile frontend'e iletir — frontend'in doğrudan Firestore'a bağlanması mimariye aykırıdır (bkz. kök CLAUDE.md).

## İlan (Listing) Domain Kuralları

- Zorunlu alanlar: fiyat, m², oda sayısı, konum (lat/lng), ilan tipi (satılık/kiralık).
- Durum makinesi: `draft → published → sold/rented → archived`. Geçersiz geçişler service katmanında engellenir.
- Fiyat değişikliği ayrı bir `priceHistory` subcollection'ında tutulur (`companies/{companyId}/listings/{listingId}/priceHistory/{entryId}`).
- Soft delete tercih edilir (`deletedAt` alanı), kalıcı silme yapılmaz.

## Firebase Storage (Video, Fotoğraf, PDF)

- Path standardı: `companies/{companyId}/listings/{listingId}/images|videos/...` ve `companies/{companyId}/customers/{customerId}/documents/...` (PDF sözleşme vb.).
- Dosya tipi ve boyutu backend'de doğrulanır, dosya adı sanitize edilir, duplicate isim engellenir.
- Video: yükleme sonrası metadata (duration, resolution) ve thumbnail oluşturma işlemi queue'ya alınır — dosya işlenmeden Firestore'da ilgili doküman "hazır" olarak işaretlenmez.
- Firestore'daki doküman silindiğinde bağlı Storage dosyası da silinir (senkron bozulmaz) — bu genelde bir Cloud Function veya backend service fonksiyonu ile garanti altına alınır.
- Storage private ise backend imzalı URL (`getSignedUrl`) üretir, dosyalar public URL ile paylaşılmaz.

## Security

- Helmet, CORS, rate limit, input validation (`zod`) zorunlu.
- JWT doğrulanmadan hiçbir endpoint çalışmaz; rol kontrolü (Admin/Manager/Employee/Super Admin) middleware'de yapılır, controller'da yazılmaz.
- `companyId` her zaman JWT'den okunur, body/query'den gelen değer yok sayılır.

## Kod Kalitesi

- Fonksiyonlar tek sorumluluğa sahip olur, 500 satırlık service yazılmaz.
- Magic string kullanılmaz — status/role/permission/listing type enum veya constants altında tutulur.
- Tekrar eden Firestore erişim mantığı (ör. "şirket dokümanını doğrula") repository/utility'de toplanır, her modülde tekrar yazılmaz.

## Test ve Doğrulama

```bash
npm run lint
npm test
npm run test:integration   # varsa (Firestore emulator ile)
```

- Firestore testleri için mümkünse Firebase Local Emulator Suite kullan, prod projeye test verisi yazma.
- **Tenant izolasyon testi zorunlu**: "A firmasının repository'si B firmasının subcollection'ına asla erişemiyor" testi güvenlik kritik, opsiyonel değildir.

## Dokümantasyon

Yeni endpoint, webhook, cron, queue, environment variable, yeni Firestore koleksiyonu/composite index eklendiğinde dokümantasyon güncellenir.

## Yapılmaması Gerekenler

- Controller içinde business logic veya doğrudan Firestore sorgusu yazma.
- Repository dışında Firestore/Storage erişimi yapma.
- `companyId`'siz, üst seviyede tenant'tan bağımsız koleksiyon açma.
- Frontend'in Firestore'a doğrudan bağlanmasına izin verme.
- Döngü içinde tek tek `.get()` ile N+1 okuma yapma.
- Firestore'un desteklemediği "tam metin arama" veya "yarıçap içinde ara" gibi sorguları native `where` ile taklit etmeye çalışma — harici servis/geohash kullan.
- Hardcoded URL / companyId / userId.
- `console.log` ile debug bırakma — logger (winston/pino) kullan.
- `.env` veya Firebase service account JSON'unu commit etme.
