# INSTALL.md — Yeni Müşteri Kurulumu

> Senaryo: Bu projeyi ikinci (üçüncü, ...) bir emlak firmasına satıyorsunuz.
> Mimari gerekçeler için `ARCHITECTURE.md`, güvenlik detayları için
> `SECURITY.md`, deploy sonrası kontrol için `CHECKLIST.md`'ye bakın.

## Mimari Özet

- **Backend (Railway) ve Meta App (Instagram/WhatsApp) her zaman paylaşımlı/sizin** —
  yeni bir Railway servisi, yeni bir Meta App **açılmaz**. Meta bir App'e tek bir
  webhook adresi tanımlamaya izin verdiği için bu zaten zorunlu — aksi halde her
  müşteri kendi Meta App Review'unu yapmak zorunda kalır.
- **Her müşterinin Firestore/Storage'ı KENDİ Firebase projesinde, kendi Google
  faturasında** — siz kurulumu yapıyorsunuz ama proje/fatura müşteriye ait,
  kullanım masrafını siz ödemiyorsunuz.
- **Firebase Authentication merkezi kalır** (sizin projenizde) — frontend zaten
  Firestore/Storage'a hiç doğrudan bağlanmıyor, sadece giriş için Auth kullanıyor
  (bkz. `SECURITY.md`), bu yüzden `VITE_FIREBASE_*` değerleri **her müşteride
  aynı** kalır (merkezi projenin config'i) — değişen tek şey `VITE_TENANT_ID`.

## Adım 1 — Müşterinin Kendi Firebase Projesi

Müşteri (ya da siz, onun Google hesabıyla) kendi tarafında:

1. [Firebase Console](https://console.firebase.google.com) → **Add project** →
   proje adı (örn. `kartal-emlak`).
2. **Blaze plana geçin** — Storage için zorunlu, Spark (ücretsiz) planda
   Storage hiç açılamaz. Bu adımdan sonra kullanım masrafı **müşterinin**
   Google faturasına gider.
3. **Firestore** → Build → Firestore Database → "Create database" →
   **Native mode** → bir bölge seçin (sonradan değiştirilemez).
4. **Storage** → Build → Storage → "Get started" → varsayılan bucket'ı kabul edin.
5. **Rules** — Firestore Database → Rules ve Storage → Rules sekmelerine, bu
   repodaki `firestore.rules` / `storage.rules` içeriğini **birebir**
   yapıştırıp **Publish** deyin (her müşteri projesinde ayrı ayrı tekrarlanır
   — `SECURITY.md`'deki gerekçe için bkz. "Firestore Rules / Storage Rules").
6. **Backups** (opsiyonel ama önerilir) — Firestore Database → Backups →
   Daily + Weekly açın (bkz. `BACKUP.md`).
7. **Servis Hesabı Anahtarı** — Proje Ayarları → Hizmet Hesapları → Firebase
   Admin SDK → **"Yeni özel anahtar oluştur"** → JSON dosyasını indirin.

> ⚠️ Bu JSON dosyasını git'e eklemeyin, kimseyle (bir sohbet dahil)
> paylaşmayın — içindeki `private_key` o projenin tam yönetici yetkisidir.
> Kurulumdan sonra sadece şifreli haliyle merkezi `tenants/{id}.firebase`
> dokümanında saklanır (bkz. `ARCHITECTURE.md`).

Storage bucket adını da not edin (Proje Ayarları → Genel → "Your apps"
altında ya da Storage sekmesinin üstünde görünür, genelde
`{proje-id}.appspot.com` veya `{proje-id}.firebasestorage.app`).

## Adım 2 — Tenant + Owner Hesabını Oluşturun

Merkezi backend'in ortam değişkenlerine erişiminiz olan bir yerden (örn.
kendi makinenizden, `server/.env` ile):

```bash
cd server
node scripts/bootstrap-owner.js sahibi@kartalemlak.com GucluBirSifre123 ~/Downloads/kartal-emlak-firebase-adminsdk.json kartal-emlak.appspot.com "Kartal Emlak" "Sahibinin Adı Soyadı"
```

Bu script:
1. Merkezi projede yeni bir `tenants` dokümanı açar.
2. Verdiğiniz service-account JSON'unu doğrulayıp (`project_id`/`client_email`/
   `private_key` var mı) şifreli şekilde o tenant dokümanına kaydeder.
3. Bağlantıyı küçük bir yaz+sil testiyle doğrular — bozuk key/kapalı API/
   olmayan bucket gibi sorunlar burada, müşterinin ilk gerçek işleminde değil,
   hemen ortaya çıkar.
4. Owner'ın `users/{uid}` dokümanını **müşterinin kendi projesine** yazar.
5. Merkezi Firebase Authentication'da hesabı açar/custom claims'i ayarlar.

Ekrana basılan **tenant id**'yi not edin — Adım 3'te `VITE_TENANT_ID`'ye yazılacak.

## Adım 3 — Yeni Vercel Projesi (Müşterinin Kendi Domaini/Markası)

Kök dizinden yeni bir Vercel projesi açın (Vite otomatik algılanır):

| Değişken | Değer |
|---|---|
| `VITE_API_URL` | **Mevcut** (paylaşımlı) backend'in adresi — her müşteride aynı |
| `VITE_TENANT_ID` | Adım 2'de üretilen tenant id |
| `VITE_FIREBASE_*` | **Merkezi** projenin `firebaseConfig`'i — her müşteride aynı (sadece Auth için kullanılır, bkz. yukarıdaki "Mimari Özet") |

`vercel.json` (SPA rewrite) zaten repoda, dokunmanıza gerek yok.

## Adım 4 — Backend'de CORS

Backend'in `CORS_ORIGINS`'ine yeni Vercel domainini ekleyip (virgülle
ayırarak — zaten çoklu domain destekliyor, bkz. `ARCHITECTURE.md`) backend'i
yeniden deploy edin.

## Adım 5 — Marka/Görsel Özelleştirme

Bunlar `.env`'den DEĞİL kod içinden okunur, yeni müşterinin markasına göre
elle değiştirip **bu Vercel projesine özel** commit/deploy edilmesi gerekir:

| Dosya | Ne değişir |
|---|---|
| `src/config/siteConfig.js` | İşletme adı, telefon, adres, WhatsApp, sosyal linkler |
| `index.html` | Sayfa başlığı, meta açıklama |
| `public/favicon.svg` | Favicon |
| `src/styles/tokens.css` | `--brand-navy`/`--brand-gold` marka renkleri |

## Adım 6 — Instagram/WhatsApp

Müşteri kendi admin panelinden giriş yapıp Ayarlar → Entegrasyonlar →
**"Instagram Hesabını Bağla"** der — Meta App Review onaylıysa bu anında
çalışır, sizin hiçbir ek işleminize gerek kalmaz (bkz.
`project_meta_app_review_needed`).

## Adım 7 — (Opsiyonel) Örnek İlanlarla Başlatın

Kendi örnek/başlangıç ilanlarınız varsa, `server/scripts/migrate-properties.js`'i
referans alıp benzer bir script yazabilirsiniz — **not:** bu script eski
(tek-merkezi-proje) varsayımıyla yazıldı, tenant-scoped bir projeye karşı
kullanmadan önce güncellenmesi gerekir. **Zorunlu değil** — boş başlayıp ilk
ilanı admin panelinden de ekleyebilirler.

## Adım 8 — Doğrulama

`CHECKLIST.md`'deki tüm maddeleri işaretleyin. En azından: gerçek bir
tarayıcıdan anasayfa, ilan detay sayfası, admin girişi ve bir CRUD işlemi
(örn. müşteri oluşturma) test edilmeden "kurulum tamam" denmemeli — ve o
CRUD işleminin gerçekten **müşterinin kendi Firebase projesinde** oluştuğunu
(Şahin Emlak'ın projesinde DEĞİL) Firebase Console'dan doğrulayın.
