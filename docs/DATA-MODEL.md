# DATA-MODEL.md — PostgreSQL Şeması ve R2 Yapısı

Şemanın tek otoriter kaynağı `server/migrations/*.js` (sırayla uygulanır,
`node-pg-migrate`) — bu doküman onun okunabilir bir özeti, çelişki
durumunda migration dosyaları geçerlidir.

## Ortak Sütunlar

`sessions` ve `tenants.id`/`users.id` dışında her tablo şu "audit"
sütunlarına sahip: `created_at, updated_at, deleted_at, created_by,
updated_by` (bkz. `server/src/models/base.model.js#withCreateFields`).
Tüm ID'ler `TEXT PRIMARY KEY` — çoğu `randomUUID()` ile üretilir
(`BasePostgresRepository#create`), `tenants`/`users` de dahil (owner id'si
artık Firebase uid değil, aynı şekilde bir UUID — bkz. `HISTORY.md`).

`deleted_at IS NULL` her `find*` sorgusunda otomatik filtrelenir (soft
delete) — `users` tek istisna: gerçek (hard) `DELETE` kullanır, çünkü
silindiğinde ilişkili `sessions` satırlarının da (FK `ON DELETE CASCADE`)
anında, kalıcı olarak gitmesi gerekir.

## Tablolar

| Tablo | Silme türü | Kısa açıklama |
|---|---|---|
| `tenants` | soft | Tek satır (tek-kiracılı deployment) — ofis bilgisi, plan/kullanım, entegrasyon ayarları |
| `users` | **hard** | Ekip hesapları — `password_hash` (bcrypt), rol, durum |
| `sessions` | yok (revoke) | Oturum token hash'leri — `users`'a `ON DELETE CASCADE` |
| `properties` | soft | İlanlar |
| `property_media` | soft | İlan foto/video'ları — `properties`'e `ON DELETE CASCADE` |
| `vehicles` | soft | Araç ilanları |
| `vehicle_media` | soft | Araç foto/video/belgeleri — `vehicles`'e `ON DELETE CASCADE` |
| `customers` | soft | Müşteri/danışan kartları |
| `leads` | soft | Public formlardan gelen başvurular |
| `appointments` | soft | Randevular |
| `conversations` | soft | Instagram/WhatsApp mesajlaşma oturumları |
| `messages` | soft | Tek tek mesajlar — `conversations`'a `ON DELETE CASCADE` |
| `funnels` | soft | Kampanya/landing sayfaları |
| `automation_events` | soft | Otomasyon geçmişi (gönderilen/bekleyen mesajlar) |

## Sütunlar (tablo tablo)

**`tenants`**
```
name, slug (UNIQUE, sadece deleted_at IS NULL iken), owner_user_id, phone, tax_number,
plan JSONB { name, limits:{users,storageMb,properties} },
usage JSONB { users, properties, storageBytes },
status ('trial'|'active'|'past_due'|'cancelled'), trial_ends_at,
instagram JSONB, whatsapp JSONB, facebook_page JSONB,
role_permissions JSONB, automations JSONB
```

**`users`**
```
tenant_id, email (UNIQUE), phone, display_name, photo_url,
password_hash (bcrypt, sadece auth.service.js#login okur),
role ('owner'|'admin'|'agent'|'assistant'|'viewer'),
permissions TEXT[], status ('active'|'passive'), last_login_at
```
`password_hash` API yanıtlarına ASLA çıkmaz — `user.postgres.repository.js`
her okuma metodunda (`findById`/`findAll`/`create`/`update`) bunu bilerek
çıkarır; sadece `findByEmailWithPasswordHash` (login için) döner.

**`sessions`**
```
id, user_id (FK → users, ON DELETE CASCADE), tenant_id,
token_hash (SHA-256, UNIQUE), created_at, expires_at, revoked_at
```
Audit sütunları yok — sadece `expires_at`/`revoked_at` ile bir oturumun
geçerli olup olmadığı belirlenir. Ham token ASLA burada durmaz, sadece
hash'i (bkz. `server/src/utils/session.util.js`).

**`properties`**
```
tenant_id, category ('satilik'|'kiralik'), type ('Daire'|'Müstakil'|'Arsa'),
title, listing_no, price (TEXT — hazır biçimlendirilmiş, örn. "2.750.000 TL"),
province, district, neighborhood, street, rooms, area, floor, zoning_status,
has_video, description, amenities TEXT[], show_location,
status ('published'|'unpublished')
```
> `rooms`/`floor` sadece Daire/Müstakil'de, `zoning_status` sadece
> Arsa'da anlamlı. `price` bilerek bir gösterim string'i, sayısal bir
> sütun değil — filtre/sıralama kodu (`parsePriceNumber`) bunu ayrıştırır.

**`property_media`**
```
property_id (FK, ON DELETE CASCADE), kind ('image'|'video'),
object_key, url, position, is_cover (en fazla 1 tane, kısmi UNIQUE index),
video_duration_seconds, mime_type, file_size, width, height
```

**`vehicles`**
```
tenant_id, category ('satilik'|'kiralik'), brand, model, year, km,
fuel_type, transmission, body_type, engine_size, engine_power, drivetrain,
color, door_count, seat_count, plate_nationality, warranty,
service_maintained, inspection_valid_until, key_count,
title, listing_no, price, negotiable, trade_in, credit_eligible,
status ('active'|'reserved'|'sold'|'unpublished'),
tramer_record, damage_amount, changed_parts_count, painted_parts_count,
local_painted_parts_count, parts_status JSONB, equipment TEXT[],
has_video, description, history JSONB, expertise_report_name, admin_notes
```

**`vehicle_media`**
```
vehicle_id (FK, ON DELETE CASCADE), kind ('image'|'video'|'document'),
object_key, url, category, visibility ('public'|'admin_only'), document_label,
position, is_cover, mime_type, file_size, width, height, video_duration_seconds
```
`visibility='admin_only'`: ör. ekspertiz raporu gibi sadece ekibin gördüğü
belgeler — public site bunları hiç listelemez.

**`customers`**
```
tenant_id, role ('Alıcı'|'Satıcı'), selling_listing_id (FK → properties, SET NULL),
name, phone, email, instagram, photo, source, status,
interests TEXT[], budget_min, budget_max, desired_province, desired_district,
notes, tags TEXT[], timeline JSONB [{id,label,at}], response_alert_sent_at
```

**`leads`**
```
tenant_id, name, phone, message, context, funnel_id (FK → funnels, SET NULL),
status ('Yeni'|...), response_alert_sent_at
```

**`appointments`**
```
tenant_id, customer_id (FK → customers, SET NULL), service_type,
listing_id (FK → properties, SET NULL, opsiyonel — ör. "Kredi Danışmanlığı"),
date_time (BIGINT, epoch-ms — bilerek TIMESTAMPTZ değil, diğer tüm
zaman alanlarından farklı), status ('Beklemede'|'Onaylandı'|'Tamamlandı'|
'İptal Edildi'), note, reminder_sent_at
```

**`conversations`**
```
tenant_id, channel ('instagram'|'whatsapp'), external_user_id,
participant_name, participant_username, participant_avatar_url,
customer_id (FK → customers, SET NULL), status ('open'|'closed'),
last_message_at, last_message_preview, last_message_direction,
unread_count, window_expires_at, last_auto_reply_at, window_alert_sent_at
```

**`messages`**
```
tenant_id, conversation_id (FK, ON DELETE CASCADE), direction ('inbound'|'outbound'),
text, attachments JSONB [], external_message_id, sender_id, status
```

**`funnels`**
```
tenant_id, name, slug (UNIQUE, deleted_at IS NULL iken), status ('draft'|'published'),
headline, subheadline, video_url, hero_image, cta_text, form_enabled
```

**`automation_events`**
```
tenant_id, type, customer_id/listing_id/appointment_id/conversation_id/lead_id (hepsi FK, SET NULL),
channel ('whatsapp'|...), status ('sent'|'pending_manual'|'manual_sent'|'failed'),
message, wa_link, error_message, sent_at
```

## İlişkiler

Postgres'te GERÇEK foreign key'ler var (Firestore döneminden farklı,
uygulama seviyesinde ayrıca kontrol etmeye gerek yok — DB seviyesinde
garanti). Özet: bkz. `ARCHITECTURE.md` → "Veri Modeli / İlişkiler". Ayrıca
**her tablonun** `tenant_id` sütunu var (asıl "her şeyi birbirine bağlayan"
alan budur, tek-kiracılı modelde tek bir sabit değer taşır).

Frontend'de referanslar **enrichment** ile de ayrıca çözülüyor (bkz.
`ARCHITECTURE.md`'deki cache+subscribe deseni) — backend'de değil.

## Index'ler

Her tabloda en az `idx_<tablo>_active` (`tenant_id [,status] WHERE
deleted_at IS NULL`) var — HER repository sorgusu bu şekli kullanıyor.
Ayrıca FK sütunlarında (`customer_id`, `listing_id`, `conversation_id`
vb.) ve sık aranan alanlarda (`listing_no`, `external_user_id`, `date_time`)
ayrı index'ler var. Tam liste için ilgili migration dosyasına bakın —
`CREATE INDEX` satırları hepsi orada, tekrar burada listelenmiyor.

## Kimlik Doğrulama Nasıl Sorgulanıyor

`server/src/services/auth.service.js#verifySessionToken` HER İSTEKTE iki
sorgu yapar: (1) `sessions`'ta token hash'i ara, (2) bulunursa `users`'tan
canlı satırı çek. Bu, ölçek büyüdükçe (çok kullanıcı, çok istek) izlenmesi
gereken bir maliyet — bugünkü ölçekte (bir avuç kullanıcı) önemsiz.

## Kurallar

Bkz. `SECURITY.md` — tüm erişim kontrolü backend'de (`authMiddleware` →
`tenantMiddleware` → `authorize(permission)`), tarayıcı Postgres'e ya da
R2'ye asla doğrudan bağlanmaz.

---

## R2 — Object Key Yapısı

```
{kind}/{uuid}.{ext}
```
Örnek: `properties/edc10a7e-4a25-4ada-85bd-f6cb978ec148/image/1c5997ef-f3ec-473c-bfd4-5af8a717eed6.webp`
(gerçek anahtarlar `property.postgres.service.js`/`vehicle.postgres.service.js`
içindeki presign fonksiyonlarınca üretilir — tam desen için o dosyalara
bakın, burada sabit bir kural olarak tekrar edilmiyor çünkü domain'e göre
küçük farklar var, ör. `properties/{propertyId}/{kind}/{uuid}.{ext}`).
Bu deployment TEK-KİRACILI (tek bucket, tek müşteri) olduğu için, eski
Firebase Storage döneminden farklı olarak bir `tenants/{tenantId}/` önekine
gerek yok.

Kullanıcının yüklediği orijinal dosya adı (örn. `IMG_2024.jpg`) **hiç
kullanılmaz** — hem çakışmayı önlemek hem de dosya adı üzerinden bir
tahmin/numaralandırma saldırısını engellemek için her zaman rastgele UUID.

## Upload Sistemi — Presigned URL Akışı (uçtan uca)

Eski (Firebase Storage) akışının aksine dosya HİÇBİR ZAMAN backend'in
kendi belleğinden/diskinden geçmez — tarayıcı R2'ye DOĞRUDAN yazar:

```
1. Admin panel → dosya seçilir
2. → POST /properties/:id/media/intent (kind, mimeType, fileSize)
3. → Backend: assertValidUpload() (mediaUpload.helpers.js) + presigned PUT URL üretir (storage.client.js#getUploadUrl)
4. → Frontend: fetch(uploadUrl, { method: 'PUT', body: file }) — DOĞRUDAN R2'ye, backend'i atlayarak
5. → POST /properties/:id/media/confirm (objectKey)
6. → Backend: storage.client.js#headObject() ile R2'ye "bu obje GERÇEKTEN var mı, boyutu/tipi iddia edilenle eşleşiyor mu" diye sorar
7. → property_media satırı Postgres'e yazılır, { url, id, ... } döner
```

**Neden presigned URL (eski `multer` + backend-proxy akışı değil):**
Backend'in dosyanın baytlarına hiç dokunmaması demek — büyük video
yüklemelerinde backend'in RAM/CPU'sunu tüketmez, R2 secret key'i frontend'e
hiç gitmez (sadece TEK object_key için kısa süreli bir imza gider). Adım 6
kritik: istemcinin gönderdiği `fileSize`/`mimeType`'a asla körü körüne
güvenilmez, R2'nin kendisine sorulur — aksi halde yarım/bozuk bir yükleme
sessizce "başarılı" görünen bir DB satırı üretebilir.

Boyut/tip limitleri (`server/src/config/constants.js#UPLOAD_LIMITS`):
resim 10MB (jpeg/png/webp), video 200MB (mp4/mov), belge 20MB (pdf/docx).

**Silme:** Bir medya kaydı silindiğinde, ilgili `object_key` R2'den de
gerçekten silinir (`storage.client.js#deleteFile`) — DB satırı ile R2'deki
dosya birlikte yönetilir.

## Erişim kontrolü

Bkz. `SECURITY.md` — tarayıcı Postgres'e ya da R2'ye asla doğrudan
bağlanamaz, R2 credential'ları sadece backend'de yaşar (bkz.
`server/src/db/storage.client.js`).
