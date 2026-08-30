# Faz 0 — Frontend Envanteri ve API Sözleşme Haritası

> Kod yok, sadece analiz. `emlak-crm-backend-prompt-v2.md` brief'inin C bölümüne göre hazırlandı. Onaydan sonra Faz 1'e (iskelet) geçilecek.

`FRONTEND_YOLU`: `/Users/cihanhayta/Desktop/emlak-web` (proje kökü — `.`)

---

## ÖZET — En önemli bulgu

**Frontend'de tek bir gerçek network çağrısı yok.** `fetch`, `axios`, `useSWR`, `useQuery`, `XMLHttpRequest` için tüm `src/` taranmış, **0 sonuç**. `import.meta.env`/`VITE_API`/`API_BASE` için **0 sonuç**. `firebase`/`firestore` için **0 sonuç**. Hiç `.env` dosyası yok.

Bunun yerine "backend" bugün tamamen **7 localStorage tabanlı Store modülü + 1 IndexedDB tabanlı medya deposu** ile tarayıcı içinde simüle ediliyor:

| Store dosyası | Ne tutuyor |
|---|---|
| `src/lib/leadStore.js` | Gelen formlar (public site → admin "Başvurular") |
| `src/admin/data/customerStore.js` | Müşteri kartları (CRM) |
| `src/admin/data/appointmentStore.js` | Randevular |
| `src/admin/data/listingStore.js` | Admin panelinden eklenen ilanlar |
| `src/admin/data/notificationStore.js` | Bildirim çanı |
| `src/admin/data/settingsStore.js` | Kullanıcılar (ekip) + rol/izin matrisi |
| `src/lib/mediaStore.js` | Fotoğraf/video dosyaları (IndexedDB, ham `File`/`Blob`) |

Yani **C.1 (Ağ çağrısı envanteri) klasik anlamda boş** — onun yerine her Store'un export ettiği fonksiyonu "bugünün fiili API'si" kabul edip haritaladım. Her fonksiyon birebir bir REST endpoint'e karşılık geliyor; bu belgenin asıl işi bu.

**İkinci önemli bulgu:** `/admin/mesajlar` (WhatsApp/Instagram birleşik gelen kutusu) rotası **`PlaceholderPage`** — yani sizin öncelikli istediğiniz Instagram DM yönetimi için **frontend'de hiçbir ekran, veri şekli veya store yok**. Bu, karar listesinde 1 numaralı madde (aşağıda).

---

## C.1 — "Ağ Çağrısı" Envanteri (Store fonksiyonları → önerilen endpoint)

### `leadStore.js` (gelen formlar)
| Fonksiyon | Ne yapıyor | Kullanıldığı ekran | → Endpoint |
|---|---|---|---|
| `getLeads()` | Tümü, `createdAt` DESC | Başvurular, Dashboard, CommandPalette değil | `GET /leads` |
| `addLead({name,phone,message,context})` | Yeni lead + bildirim | `useInquiryForm` (İletişim, ServiceRequestModal, İlan detay formu) | `POST /leads` |
| `removeLead(id)` | Sil | Başvurular (çöp ikonu) | `DELETE /leads/:id` |
| `updateLeadStatus(id,status)` | Triyaj durumu | Başvurular (Select) | `PATCH /leads/:id/status` |
| `subscribeToLeads(cb)` | Değişiklik dinleyici | — | (websocket/polling yok, UI-only) |

### `customerStore.js` (müşteri kartları / CRM)
| Fonksiyon | Ne yapıyor | Ekran | → Endpoint |
|---|---|---|---|
| `getCustomers()` | Tümü, `createdAt` DESC | Müşteriler, Dashboard, SalesPipeline, CommandPalette, CustomerSheet (Satıcı eşleşmesi) | `GET /customers` |
| `getCustomerById(id)` | Tekil | — (şu an kullanılmıyor, hazır duruyor) | `GET /customers/:id` |
| `addCustomer(data)` | Yeni kart (+ ilk timeline kaydı) | CustomerSheet (yeni), Başvurular (randevu oluştur) | `POST /customers` |
| `updateCustomer(id,updates)` | Kısmi güncelleme | CustomerSheet (düzenle), CustomerCard (context menu durum), SalesPipeline (sürükle-bırak) | `PATCH /customers/:id` |
| `addTimelineEntry(id,label)` | Timeline'a serbest metin ekle | Durum değişince otomatik | (backend: `activityLogs`'a veya customer alt-koleksiyonuna yazan iç fonksiyon, ayrı endpoint gerekmeyebilir) |
| `deleteCustomer(id)` | Sil | CustomerCard context menu | `DELETE /customers/:id` |
| `subscribeToCustomers(cb)` | Değişiklik dinleyici | Her yerde | — |

### `appointmentStore.js` (randevular)
| Fonksiyon | Ne yapıyor | Ekran | → Endpoint |
|---|---|---|---|
| `getAppointments()` | Tümü, `dateTime` ASC, **her randevuya `listing` objesi denormalize edilmiş halde ekleniyor** (`getPropertyById(listingId)`) | Randevular, Dashboard, CustomerCard (randevu ikonu), reminders hook | `GET /appointments` (backend join/populate yapmalı) |
| `getAppointmentById(id)` | Tekil | — | `GET /appointments/:id` |
| `addAppointment(data)` | Yeni (`status` varsayılan "Beklemede") | AppointmentFormDialog | `POST /appointments` |
| `updateAppointment(id,updates)` | Kısmi güncelleme | AppointmentFormDialog (düzenle), AppointmentDetailPanel (hızlı durum), Appointments tablosu (dropdown) | `PATCH /appointments/:id` |
| `deleteAppointment(id)` | Sil | (export edilmiş ama hiçbir yerde çağrılmıyor — **ÖLÜ**) | `DELETE /appointments/:id` |
| `subscribeToAppointments(cb)` | — | Her yerde | — |

### `listingStore.js` (admin ilan yönetimi)
| Fonksiyon | Ne yapıyor | Ekran | → Endpoint |
|---|---|---|---|
| `getListings()` | Tümü (dizi tersten — gerçek `createdAt DESC` değil) | Listings, CustomerSheet (Satıcı ilan bağlama), CommandPalette (properties.js üzerinden) | `GET /properties` |
| `getListingById(id)` | Tekil | ListingForm (düzenleme), staleListing.js | `GET /properties/:id` |
| `addListing(data)` | Yeni: `id`(uuid), `listingNo`(6 haneli **rastgele, çakışma kontrolü yok**), `createdAt` server-side üretiliyor | ListingForm (yeni ilan) | `POST /properties` |
| `updateListing(id,updates)` | Sığ merge — **tip değişince `rooms`/`floor`/`zoningStatus` `undefined` yazılıp siliniyor** | ListingForm (düzenle) | `PATCH /properties/:id` |
| `deleteListing(id)` | Sil | Listings | `DELETE /properties/:id` |
| `subscribeToListings(cb)` | — | Her yerde | — |

### `notificationStore.js`
| Fonksiyon | Ekran | → Endpoint |
|---|---|---|
| `getNotifications()`, `getUnreadCount()` | Bildirimler, NotificationBell | `GET /notifications`, `GET /notifications/unread-count` |
| `addNotification({title,description,type})` | leadStore ve reminders hook'undan otomatik tetikleniyor | (backend: iç servis çağrısı, dış endpoint gerekmez) |
| `markAsRead(id)`, `markAllAsRead()` | Bildirimler, NotificationBell | `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| `deleteNotification(id)`, `deleteNotifications(ids)`, `deleteAllNotifications()` | Bildirimler (tekli/toplu sil) | `DELETE /notifications/:id`, toplu silme için ek endpoint |
| `subscribeToNotifications(cb)` | Her yerde | — |

### `settingsStore.js` (**sadece kullanıcılar + izin matrisi — şirket bilgisi/çalışma saati/entegrasyon YOK**)
| Fonksiyon | Ekran | → Endpoint |
|---|---|---|
| `getUsers()`, `addUser({name,email,role})`, `updateUser(id,updates)`, `deleteUser(id)` | Ayarlar → Kullanıcılar | `GET/POST /users`, `PATCH/DELETE /users/:id` |
| `getRolePermissions()`, `togglePermission(role,permission)` | Ayarlar → Yetkiler | `GET/PATCH /settings/role-permissions` (veya `constants.js`'teki gibi sabit kalabilir — aşağıda karar #3) |

### `mediaStore.js` (IndexedDB — gerçek "upload" yok, bkz. C.3)

---

## C.2 — Veri Şekli Envanteri

**Genel gözlem:** Tüm alan adları **İngilizce camelCase** (`listingNo`, `desiredDistrict`, `hasVideo`...) — Türkçe snake_case yok, karışıklık yok. Ama **değerler** çoğunlukla Türkçe string enum'lar (`"satilik"`, `"Daire"`, `"3+1"`, `"Alıcı"`...). Tarihler her yerde **epoch ms** (`Date.now()`), ISO string yok. Bu tutarlı, backend bunu aynen koruyabilir.

**En kritik veri şekli sorunu — fiyat:** `price` alanı sayı değil, **`"2.750.000 TL"` / `"22.000 TL / Aylık"` gibi hazır biçimlendirilmiş bir string.** Para birimi ve kira/satış eki string'in içine gömülü. `matchCustomers.js` bunu `.replace(/[^\d]/g,"")` ile sayıya çeviriyor. Bu, backend'de sıralama/filtreleme için ciddi bir tasarım kararı gerektiriyor (karar #4).

### Property/Listing şeması (properties.js + ListingForm.jsx birleşimi)
```
id (string slug, örn "satilik-1"), category ("satilik"|"kiralik"), type ("Daire"|"Müstakil"|"Arsa"),
title, listingNo (string, sayısal görünümlü), price (STRING, yukarıya bak),
province (hiçbir kayıtta yok — filtre "İstanbul" varsayıyor), district, neighborhood, street,
rooms (Arsa'da yok), floor (Arsa'da yok, serbest metin — "5. Kat"/"Tripleks", SAYI DEĞİL),
area (sayı, m², Arsa dahil hepsinde var), zoningStatus (sadece Arsa'da),
image (kapak), images[] (sadece 19 flagship ilanda — 234 filler ilanda yok),
hasVideo, videoDuration (ListingForm hiç yazmıyor — admin'den eklenen video hiç süre göstermez, ÖLÜ alan),
videoUrl (tekil), videoRefs[] (admin form çoklu video destekliyor ama public site sadece ilkini okuyor — karar #5),
description, amenities[] (20 sabit + serbest metin), showLocation (bool),
createdAt (sadece admin listingStore'da; ham properties.js kayıtlarında yok)
```

### Customer şeması (customerStore.js + CustomerSheet.jsx)
```
id, role ("Alıcı"|"Satıcı"), sellingListingId (Satıcı ise bağlı ilan),
name, phone, email, instagram, photo,
source (LEAD_SOURCES enum — artık 4 hizmet adını da içeriyor, bu oturumda genişletildi),
status (CUSTOMER_STATUSES: Yeni/Arandı/Teklif Verildi/Randevu Oluşturuldu/Satış Oldu/Kaybedildi),
interests[] (serbest metin etiketler — oda sayısı VE tip karışık: "3+1","Villa","Yatırımlık"...),
budgetMin, budgetMax (sayı), desiredProvince, desiredDistrict,
notes, tags[] (CUSTOMER_TAGS + serbest), timeline[{id,label,at}], createdAt
```
**Not:** `phones[]`/`emails[]` gibi çoklu değer yok — orijinal backend brief'indeki E.164 çoklu telefon modeli frontend'de karşılığı olmayan bir **EKSİK** (frontend tek `phone` string tutuyor, düz metin, `+90` normalize edilmemiş).

### Appointment şeması
```
id, customerId, serviceType (bu oturumda eklendi — "İlan Gösterimi"|hizmet adı|"Genel Görüşme"),
listingId (artık opsiyonel), dateTime (epoch ms), status (Beklemede/Onaylandı/Tamamlandı/İptal Edildi), note
```
Okunurken `listing` alanı otomatik denormalize ediliyor — backend `GET /appointments`'ta aynı join'i yapmalı.

### Lead şeması
```
id, name, phone, message, context (hangi formdan geldiği — serbest metin: hizmet adı / "İletişim Formu" / ilan başlığı), status, createdAt
```

### Notification şeması
```
id, title, description, type ("randevu"|"form"|"ilan"|"genel"), read, at
```
**Önemli eksik:** hiçbir `entityId`/`entityType` yok — bildirime tıklayınca ilgili kayda değil, sadece o tipin liste sayfasına gidiliyor. Gerçek "derin link" isteniyorsa şema genişlemeli (karar #6).

---

## C.3 — Form ve Validasyon Envanteri

| Form | Alanlar | Zorunlu | Dosya yükleme |
|---|---|---|---|
| **ListingForm** (`/admin/ilanlar/yeni`, `:id`) | category, type, price*, title*, description, amenities[], area*, zoningStatus(Arsa), rooms*/floor*(Arsa değilse), province, district, neighborhood, street, photoRefs[], videoRefs[], showLocation | `*` işaretliler `required`; native `name` attribute YOK, hepsi React state (`form.<field>`) — backend validasyonu frontend'in HTML5 `required`'ına güvenemez, kendi başına doğrulamalı | Sınırsız sayıda foto (`image/*`) + video (`video/*`) — **client tarafında boyut/tip/adet limiti YOK** |
| **CustomerSheet** (yeni/düzenle müşteri) | role, sellingListingId(Satıcı), name*, phone*, email, instagram, source, status, interests[], budgetMin, budgetMax, desiredProvince, desiredDistrict, notes, tags[] | name+phone `required` | yok |
| **AppointmentFormDialog** | customerId*, listingId (artık opsiyonel), serviceType, dateTime*, status, note | customerId+dateTime `required` | yok |
| **useInquiryForm tabanlı 3 form** (İletişim, ServiceRequestModal, İlan detay "Hayalinizdeki Evler...") | name*, phone*, message | name+phone HTML `required`, hiç sunucu tarafı doğrulama yok | yok |
| **HeroSearchBar + ListingFilterBar** (arama, form değil ama sözleşme gerektiriyor) | province, district, neighborhood, type, listingNo | — | — |
| **Login** | username*, password* | native `required` | — |
| **Ayarlar → Kullanıcı Ekle** | name, email, role | — | — |

---

## C.4 — Auth Akışı (detaylı)

- **Firebase client SDK yok** (grep: 0 sonuç). Giriş tamamen `src/admin/lib/auth.js` içinde hardcoded: kullanıcı adı `"admin"`, şifre `"1234"`.
- `login()` başarılıysa `localStorage["sahin-admin-session"] = { username:"admin", name:"Admin", role:"Admin", loggedInAt }` yazıyor. **Bu `role` alanı her zaman sabit `"Admin"`** — `settingsStore.js`'teki kullanıcı listesiyle/rolleriyle **hiçbir bağlantısı yok**, iki ayrı sistem.
- `RequireAuth.jsx` sadece `localStorage`'da obje var mı diye bakıyor (senkron, süre kontrolü yok). Hiçbir isteğe token eklenmiyor (çünkü hiç istek yok).
- `ROLE_PERMISSIONS`/izin matrisi UI'da var ama **hiçbir yerde gerçekten uygulanmıyor** — her rol her sayfayı görüyor, hiçbir buton role göre gizlenmiyor. Kod yorumunun kendisi bunu "gerçek çok-kullanıcılı auth gelince yapılacak bir sonraki adım" olarak işaretliyor.
- **Göç için önemli:** `auth.js`'in 4 fonksiyonu (`getSession`, `isLoggedIn`, `login`, `logout`) TEK temas noktası — sadece `RequireAuth.jsx`, `Login.jsx`, `Topbar.jsx` tarafından kullanılıyor. Gerçek Firebase Auth'a geçerken bu 4 fonksiyonun **imzasını aynı tutup içini değiştirmek** en az riskli yol. Ama `isLoggedIn()` bugün senkron — Firebase auth state doğası gereği asenkron, bu yüzden `RequireAuth`'a bir "yükleniyor" ara durumu eklemek gerekecek (karar #2).

---

## C.5 — Ekran → İhtiyaç Haritası

| Ekran | Route | Okuduğu store'lar |
|---|---|---|
| Anasayfa, Satılık, Kiralık, İlan Detay | `/`, `/satilik`, `/kiralik`, `/ilan/:id` | properties.js (public getters) |
| Hakkımızda, Hizmetlerimiz, İletişim | public | siteConfig.js, stats.js, services.js, leadStore (İletişim formu) |
| Dashboard | `/admin` | customerStore, appointmentStore, leadStore, properties.js — 4 stat kartı + 2 liste + SalesPipeline |
| İlanlar / İlan Formu | `/admin/ilanlar*` | listingStore, mediaStore, customerStore (eşleştirme) |
| Başvurular | `/admin/basvurular` | leadStore, customerStore, appointmentStore |
| Randevular | `/admin/randevular` | appointmentStore, customerStore |
| Müşteriler | `/admin/musteriler` | customerStore, appointmentStore (kart üzeri randevu oluşturma — bu oturumda eklendi) |
| **Mesajlar** | `/admin/mesajlar` | **YOK — `PlaceholderPage`, hiçbir veri kaynağı yok** |
| Bildirimler | `/admin/bildirimler` | notificationStore |
| Ayarlar | `/admin/ayarlar` | settingsStore (sadece kullanıcı+izin) |

---

## C.6 — Ortam ve CORS

- API base URL tanımı **yok** (henüz hiç çağrı yapılmıyor).
- Public site + admin panel **aynı Vite uygulaması, aynı origin** (`react-router` ile tek SPA, `/admin/*` sadece bir route grubu). Bu, backend CORS ayarını basitleştiriyor: prod'da muhtemelen tek origin'den servis edilecek, `CORS_ORIGINS` sadece dev (`http://localhost:5173` gibi) + gerçek prod domaini içerecek.
- Dev sunucusu varsayılan `5173` portunda (bu oturumda test için `5183` de kullanıldı, önemli değil).

---

## C.7 — API Sözleşme Haritası (ana tablo)

Frontend'in gerçek network çağrısı olmadığı için "frontend çağırıyor mu" yerine **"localStorage store'u bu işlevi zaten net biçimde yapıyor mu"** ölçütünü kullandım:
- **NET** = store fonksiyonu birebir karşılıyor, çakışma yok, doğrudan port edilebilir.
- **ÇAKIŞMA** = karar gerekiyor (veri şekli/isim/tasarım çelişkisi).
- **EKSİK** = frontend'de hiç karşılığı yok, sıfırdan tasarlanacak.
- **ÖLÜ** = kodda export edilmiş ama hiçbir ekran tetiklemiyor.

| Endpoint (aday) | Durum | Not |
|---|---|---|
| `GET/POST /properties`, `GET/PATCH/DELETE /properties/:id` | NET | `listingStore.js` birebir karşılıyor |
| `GET /properties?category=&province=&district=&neighborhood=&type=&listingNo=` | NET | `filterProperties.js` mantığı net, aynen taşınabilir |
| `GET /properties/:id/similar` | NET | `getSimilarProperties` — 3 kademeli öncelik mantığı belgelendi |
| `GET /properties/:id/matches`, `GET /customers/:id/matches` | NET | `matchCustomers.js` — puanlama algoritması tam belgelendi |
| `POST /properties/:id/media` (gerçek dosya yükleme) | **ÇAKIŞMA** | Bugün IndexedDB'de ham dosya — gerçek upload'a geçiş (karar #7) |
| `listingNo` üretimi | **ÇAKIŞMA** | Bugün 6 haneli rastgele, çakışma kontrolü yok — backend'de transaction'lı sayaç mı, yoksa mevcut rastgele mantık mı korunsun? |
| `GET/POST /customers`, `PATCH/DELETE /customers/:id` | NET | `customerStore.js` birebir |
| `GET /customers/:id/timeline` | **ÇAKIŞMA** | Bugün timeline sadece customer objesinin İÇİNDE bir dizi (ayrı koleksiyon değil) — brief'in önerdiği ayrı `notes`/`tasks`/`appointments` birleşimi mi, yoksa mevcut basit iç dizi mi? |
| `GET/POST /appointments`, `PATCH /appointments/:id` | NET | `appointmentStore.js` birebir (`serviceType` dahil, bu oturumda eklendi) |
| `DELETE /appointments/:id` | ÖLÜ (frontend'de) | Store'da fonksiyon var, hiçbir UI çağırmıyor — yine de backend'e eklenmeli mi? (küçük karar) |
| `GET/POST /leads`, `PATCH /leads/:id/status`, `DELETE /leads/:id` | NET | `leadStore.js` birebir |
| `GET/PATCH /notifications` | NET | `notificationStore.js` birebir, ama `entityId` yok (karar #6) |
| `GET/POST /users`, `PATCH/DELETE /users/:id` | NET | `settingsStore.js` birebir |
| `GET/PATCH /settings` (şirket bilgisi, çalışma saati, entegrasyonlar) | **EKSİK** | Frontend'de hiç yok — `siteConfig.js` hardcoded (telefon, adres, WhatsApp no, sosyal medya linkleri) — bunlar `settings`'e taşınmalı mı? (karar #8) |
| `POST /auth/session`, `GET /auth/me`, `POST /auth/logout` | **ÇAKIŞMA** | Mevcut `auth.js` sahte/senkron — gerçek Firebase Auth'a geçiş asenkron hale getirilmeli (karar #2) |
| `POST /auth/register-tenant`, tenant/office kavramı | **EKSİK** | Frontend tek-ofis varsayıyor, çoklu tenant kavramı hiç yok (karar #1'in devamı) |
| `GET/POST /conversations`, `/messages`, `/webhooks/whatsapp`, `/webhooks/instagram` | **EKSİK** | `/admin/mesajlar` boş placeholder — hiçbir veri şekli, hiçbir store yok |
| `GET /dashboard/stats` | NET-ile-ÇAKIŞMA karışık | 4 stat + 2 liste net belgelendi (Dashboard.jsx) ama hepsi "tüm zamanlar/sınırsız gelecek" — dönemsel (bu ay/hafta) filtre YOK bugün, brief `?from&to` istiyor (karar #9) |
| Property `price` sayısal alan + `currency` | **ÇAKIŞMA** | Karar #4 |

---

## C.8 — Karar Listesi (lütfen numaralı cevaplayın, cevaplamadan Faz 1'e geçmiyorum)

1. **Mesajlar (WhatsApp/Instagram DM)** — frontend'de hiç ekran yok. Backend'i (conversations/messages/webhooks) şimdi mi kuralım, frontend'i de (yeni ekran, "dokunma" kuralının dışında çünkü zaten boş) beraber mi yazalım — yoksa önce CRM'in geri kalanını (properties/customers/appointments) bitirip Mesajlar'ı sona mı bırakalım?
2. **Auth** — gerçek Firebase Auth'a mı geçelim (email/şifre veya Google girişi), yoksa şimdilik mevcut sahte `admin/1234` girişini bırakıp backend'i "her istek zaten owner" varsayımıyla mı kuralım (daha az iş ama gerçek çok kullanıcı/rol yönetimi çalışmaz)?
3. Buna bağlı: **tek ofis mü, çok kiracılı (multi-tenant) mı?** Frontend hiç ofis/tenant kavramı taşımıyor — bunu backend'e "gizli" tek satır (`tenantId` sabit) olarak mı ekleyelim, yoksa gerçek çoklu ofis (kayıt ol, davet et) akışını da mı kuralım?
4. **`price` alanı** — bugün `"2.750.000 TL"` gibi hazır string. Sayısal `{amount, currency}` alanına geçip frontend'in gösterim formatını backend'in döndürdüğü sayıdan üretmesini mi isteriz (frontend'e küçük bir dokunuş gerekir — presenter bunu tek başına çözemez, format frontend'de üretiliyor), yoksa backend de aynı hazır string'i mi saklasın/döndürsün (sıralama/filtreleme sayısal yapılamaz)?
5. **Video** — admin formu çoklu video yüklemeye izin veriyor ama public site sadece ilk videoyu gösteriyor. Şema tek `videoUrl`'e mi sadeleşsin (form da tek video kabul etsin), yoksa gerçek çoklu video galerisi mi hedefleyelim (public site'a da küçük bir ekleme gerekir)?
6. **Bildirimler** — bugün hangi kayda ait olduğunu tutmuyor (`entityId` yok), tıklayınca sadece liste sayfasına gidiyor. Gerçek derin link (`/randevular?id=123` gibi) ister misiniz, yoksa mevcut davranış yeterli mi?
7. **Medya yükleme** — bugün IndexedDB'de sınırsız/limitsiz dosya. Firebase Storage'a geçince boyut/adet/tip limiti (brief: 10MB foto, 200MB video) uygulayalım mı — evet ise limit aşımında frontend'e nasıl bir hata mesajı dönsün?
8. **`siteConfig.js`** (telefon, adres, WhatsApp no, sosyal medya) — bunları `settings` koleksiyonuna taşıyıp backend'den mi çekelim (agency kendi panelinden değiştirebilsin), yoksa şimdilik frontend'de sabit mi kalsın?
9. **Dashboard istatistikleri** — bugün hepsi "tüm zamanlar/sınırsız". `?from&to` dönemsel filtre ekleyelim mi, yoksa mevcut basit haliyle mi taşıyalım?
10. **`listingNo` üretimi** — bugün 6 haneli rastgele (çakışma riski var). Transaction'lı, tenant-bazlı sıralı sayaç (`EM-2026-00001` gibi orijinal brief'teki format) mı, yoksa mevcut rastgele davranışı mı koruyalım (frontend zaten bunu bir string olarak gösteriyor, formatı önemsemiyor)?

---

## Sonraki adım

Bu 10 karara verdiğiniz cevaplara göre Faz 1'i (iskelet — hiçbir dış hesap gerektirmez, `FIREBASE_MODE=mock` ile ayağa kalkar) başlatacağım. Firebase Storage/Firestore kurulumunuz bitince (proje + service account key) Faz 2'de gerçek bağlantıyı ekleyeceğiz — o zamana kadar mock modda geliştirmeye devam edebiliriz, hiçbir şeyi beklemeye gerek yok.
