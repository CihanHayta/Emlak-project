# DATA-MODEL.md — Firestore ve Storage Yapısı

## Firestore — Koleksiyon Yapısı

Tüm koleksiyonlar **düz (flat)**, iç içe alt-koleksiyon **yok**. Her
koleksiyon (tenants ve users hariç davranışta) şu ortak alanlara sahip:
`tenantId, createdAt, updatedAt, deletedAt, createdBy, updatedBy` (bkz.
`server/src/models/base.model.js`).

| Koleksiyon | Doküman ID | tenantId alanı var mı? | Silme türü |
|---|---|---|---|
| `tenants` | otomatik | **Hayır** (kendi id'si = tenant kimliği) | soft |
| `users` | Firebase Auth `uid` | Evet | **hard** (Auth ile senkron) |
| `customers` | otomatik | Evet | soft |
| `leads` | otomatik | Evet | soft |
| `appointments` | otomatik | Evet | soft |
| `properties` | otomatik | Evet | soft (Firestore) + Storage dosyaları **hard** silinir |

`deletedAt` her zaman açıkça `null` set edilir (undefined değil) —
repository sorguları `deletedAt == null` eşitliğiyle filtrelediği için bu
alanın gerçekten var olması şart, yoksa doküman hiçbir listede görünmez.

## Doküman Yapısı (alan alan)

**`tenants/{id}`**
```
name, slug, ownerUserId,
plan: { name, limits: { users, properties, storageMb } },
usage: { users, properties, storageBytes },
status ("trial"|"active"|"past_due"|"cancelled"),
trialEndsAt, phone, taxNumber, + ortak alanlar
```

**`users/{uid}`**
```
tenantId, email, phone, displayName, photoUrl,
role ("owner"|"agent"|"assistant"), permissions: [],
status ("active"|"passive"), lastLoginAt, + ortak alanlar
```

**`customers/{id}`**
```
tenantId, role ("Alıcı"|"Satıcı"), sellingListingId, name, phone, email,
instagram, photo, source, status, interests: [], budgetMin, budgetMax,
desiredProvince, desiredDistrict, notes, tags: [],
timeline: [{ id, label, at }], + ortak alanlar
```

**`leads/{id}`**
```
tenantId, name, phone, message, context, status ("Yeni"|...), + ortak alanlar
```

**`appointments/{id}`**
```
tenantId, customerId, serviceType, listingId,
dateTime (epoch ms — Timestamp DEĞİL, bilerek düz sayı),
status ("Beklemede"|"Onaylandı"|"Tamamlandı"|"İptal Edildi"),
note, + ortak alanlar
```

**`properties/{id}`**
```
tenantId, category ("satilik"|"kiralik"), type ("Daire"|"Müstakil"|"Arsa"),
title, listingNo, price (string, örn. "2.750.000 TL"),
province, district, neighborhood, street,
rooms, area, floor, zoningStatus,
image, images: [], hasVideo, videoDuration, videoUrl,
description, amenities: [], showLocation, + ortak alanlar
```

> `rooms`/`floor` sadece Daire/Müstakil'de, `zoningStatus` sadece
> Arsa'da anlamlı; ilgisiz olduğu tipte `null` kalır. `price` bilerek
> hazır biçimlendirilmiş bir gösterim string'i, sayısal bir alan değil —
> bu, filtre/sıralama kodunun (digit-stripping ile sayıya çeviren
> `parsePriceNumber`) değişmeden çalışmasını sağlıyor.

## İlişkiler

Firestore'da gerçek "foreign key" yok — ilişkiler sadece **id referansı**
ile, uygulama katmanında çözülüyor:

- `appointments.customerId` → `customers/{id}`
- `appointments.listingId` → `properties/{id}` (opsiyonel — randevu bir
  ilanla ilgili olmayabilir, örn. "Kredi Danışmanlığı")
- `customers.sellingListingId` → `properties/{id}`
- **Her şeyin** `tenantId` alanı → `tenants/{id}`

Frontend'de bu referanslar **enrichment** ile çözülüyor (bkz.
`ARCHITECTURE.md`'deki cache+subscribe deseni) — backend'de değil.

## Index'ler

Bugün **hiçbir composite index yok ve gerekmiyor**. `firestore.indexes.json`
bilerek boş:
```json
{ "indexes": [], "fieldOverrides": [] }
```

**Neden:** Composite index, bir sorgu birden fazla alanda eşitsizlik/aralık
filtresi kullandığında ya da bir eşitlik filtresiyle farklı bir alanda
`orderBy` yaptığında gerekir. Bu projedeki HER repository sorgusu
(`BaseRepository.scopedQuery`) sadece `tenantId == X` VE `deletedAt == null`
— ikisi de saf eşitlik, sunucu tarafında `orderBy` yok (sıralama bilerek
frontend'de yapılıyor). Bu, doğrudan `db.collection(...).where(...).where(...).get()`
çalıştırılarak da doğrulandı — hata vermedi.

**İleride bir index gerekirse:** Bir geliştirici backend'e `orderBy` ya
da ek bir eşitsizlik filtresi eklerse, o sorgu ilk çalıştığında Firestore
log'da "bu index'i oluşturmak için tıklayın" linkli bir hata verir; o
linke tıklamak ya da `firestore.indexes.json`'a elle ekleyip
`firebase deploy --only firestore:indexes` (ya da Console'dan elle)
deploy etmek gerekir.

## Kurallar

Bkz. `SECURITY.md` — `deny-all`, tüm gerçek erişim kontrolü backend'de.

---

## Storage — Klasör Yapısı

```
tenants/{tenantId}/{kind}/{uuid}.{ext}
```
Örnek: `tenants/trkxr48A5XRdgGuoHet4/image/55cc0733-ad67-4152-a1e5-123b2ad3cab3.png`

- `{tenantId}`: hangi firmaya ait olduğu — bir tenant'ın dosyaları başka
  bir tenant'ınkiyle asla karışmaz, ve bir tenant tamamen silinirse
  `tenants/{tenantId}/` prefix'i altındaki HER ŞEY tek seferde bulunabilir.
- `{kind}`: `image` \| `video` \| `document` — hangi uç noktadan
  (`/uploads/image` vb.) gelindiğine göre belirlenir.
- `{uuid}.{ext}`: çakışma ihtimali olmayan rastgele isim
  (`crypto.randomUUID()`), uzantı mime type'tan türetilir.

## Dosya İsimlendirme

Kullanıcının yüklediği orijinal dosya adı (örn. `IMG_2024.jpg`) **hiç
kullanılmaz** — hem çakışmayı önlemek hem de dosya adı üzerinden bir
tahmin/numaralandırma saldırısını engellemek için her zaman rastgele UUID.

## Upload Sistemi (uçtan uca akış)

```
1. Admin panel → <input type="file"> → MediaUploadField.jsx
2. → lib/mediaStore.js#uploadMediaFile(file, kind)
3. → fetch(`${API_URL}/uploads/${kind}`, { credentials: 'include', body: FormData })
4. → Backend: upload.middleware.js (multer, memoryStorage, boyut/tip kontrolü)
5. → upload.controller.js → upload.service.js#uploadFile()
6. → tenant.service.js#assertStorageWithinLimit() — plan kotasını aşıyor mu
7. → storage.client.js: bucket.file(path).save(buffer) + file.makePublic()
8. → tenant.service.js#recordStorageUsage() — kullanım sayacını artırır
9. → { url, storagePath } döner, frontend bu URL'i ilgili alana yazar
```

Dosya **asla diske yazılmaz** (multer `memoryStorage`) — doğrudan
bellekten Storage'a akar. Boyut/tip limitleri
(`server/src/config/constants.js#UPLOAD_LIMITS`): resim 10MB
(jpeg/png/webp), video 200MB (mp4/mov), belge 20MB (pdf/docx).

**Silme:** Bir ilan silindiğinde (`property.service.js#deleteProperty`),
`images[]` + `videoUrl` içindeki HER url için, eğer o url bizim
`tenants/{tenantId}/` deseniyle eşleşiyorsa (bizim yüklediğimiz bir
dosyaysa — dış/örnek bir URL değilse), Storage'dan **gerçekten** silinir.
Dış URL'ler (örn. göç edilen örnek ilanların Unsplash fotoğrafları) için
hiçbir şey yapılmaz, çünkü silinecek bir Storage dosyası yoktur.

## Rules

Bkz. `SECURITY.md` — `deny-all`, tarayıcı doğrudan bağlanamaz.
