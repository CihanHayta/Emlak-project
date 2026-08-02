# INSTALL.md — Yeni Müşteri Kurulumu

> Senaryo: Bu projeyi ikinci (üçüncü, ...) bir emlak firmasına satıyorsunuz.
> Aşağıdaki adımlar, sıfırdan yeni bir Firebase projesiyle bu kod tabanını
> onlar için ayağa kaldırır. Mimari gerekçeler için `ARCHITECTURE.md`,
> güvenlik detayları için `SECURITY.md`, deploy sonrası kontrol için
> `CHECKLIST.md`'ye bakın.

## Adım 1 — Yeni Firebase Projesi

1. [Firebase Console](https://console.firebase.google.com) → **Add project**
   → proje adı (örn. `ornek-emlak-crm`).
2. Google Analytics adımını isterseniz atlayabilirsiniz (bu proje kullanmıyor).
3. **Blaze plana geçin** — Storage'ı açabilmek için zorunlu, Spark (ücretsiz)
   planda Storage hiç açılamaz.

## Adım 2 — Console'da Servisleri Açın

1. **Authentication** → Build → Authentication → "Get started" → Sign-in
   method sekmesinden **Email/Password**'ü etkinleştirin.
2. **Firestore** → Build → Firestore Database → "Create database" →
   **Native mode** (Datastore mode değil) → size yakın bir bölge seçin
   (sonradan değiştirilemez).
3. **Storage** → Build → Storage → "Get started" → varsayılan bucket'ı
   kabul edin.
4. **Rules** — Firestore Database → Rules sekmesi ve Storage → Rules
   sekmesi, ikisine de bu repodaki `firestore.rules` / `storage.rules`
   dosyalarının içeriğini **birebir** yapıştırıp **Publish** deyin.
5. **Backups** — Firestore Database → Backups sekmesi → Daily + Weekly
   açın, saklama sürelerini belirleyin (bu projede Daily 7 gün, Weekly
   7 gün kullanıldı — kendi ihtiyacınıza göre ayarlayın).

Her adımın "neden gerekli, yapılmazsa ne olur" detayı için `SECURITY.md`
ve `BACKUP.md`'ye bakın.

## Adım 3 — Web App Ekleyin, Config Değerlerini Alın

Proje Ayarları → Genel → "Your apps" → `</>` (Web) → uygulama takma adı
girin → **firebaseConfig** objesini kopyalayın (Adım 5'te kullanılacak).

## Adım 4 — Servis Hesabı Anahtarı Alın

Proje Ayarları → Hizmet Hesapları → Firebase Admin SDK →
**"Yeni özel anahtar oluştur"** → JSON dosyasını indirin.

> ⚠️ Bu dosyayı git'e eklemeyin, kimseyle (bir sohbet dahil) paylaşmayın —
> içindeki `private_key` projenizin tam yönetici yetkisidir.

## Adım 5 — Hangi Dosyalar/Ayarlar Müşteriye Özel Değişir

| Dosya | Ne değişir |
|---|---|
| `server/.env` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET` — Adım 4'teki JSON'dan. `CORS_ORIGINS` — yeni müşterinin frontend adresi. |
| `.env` (kök) | `VITE_FIREBASE_*` — Adım 3'teki `firebaseConfig`'ten. `VITE_API_URL` — yeni müşterinin backend adresi. `VITE_TENANT_ID` — Adım 6'da üretilecek. |
| `.firebaserc` | `"default"` proje id'si → yeni Firebase proje id'sine. |
| **Kod içinde hiçbir dosya değişmez** | `src/firebase/config.js` sadece `.env`'i okur, hiçbir yerde proje id'si/API key sabit yazılı değildir (bilerek — bkz. `ARCHITECTURE.md`). |

Tam environment variable listesi için `ARCHITECTURE.md`'nin
"Environment Variables" bölümüne (ya da doğrudan `server/.env.example` /
kök `.env.example` dosyalarına) bakın.

## Adım 6 — İlk Owner Hesabını Oluşturun

```bash
cd server
node scripts/bootstrap-owner.js sahibi@ornekemlak.com GucluBirSifre123 "Örnek Emlak"
```

Bu script hem yeni bir `tenants` dokümanı hem de o firmanın tek admin
(`owner`) hesabını oluşturur ve ekrana **tenant id**'yi basar — bunu
`.env`'deki `VITE_TENANT_ID`'ye yazın.

Danışman/Personel hesapları bu script'e gerek kalmadan, owner giriş
yaptıktan sonra Ayarlar sayfasından açılır.

## Adım 7 — (Opsiyonel) Örnek İlanlarla Başlatın

Kendi örnek/başlangıç ilanlarınız varsa, `server/scripts/migrate-properties.js`'i
referans alıp benzer bir script yazabilirsiniz. **Zorunlu değil** — boş
başlayıp ilk ilanı admin panelinden de ekleyebilirler.

## Adım 8 — Deploy

1. **Backend → Railway** (ya da tercih ettiğiniz Node.js hosting):
   - Yeni bir proje oluşturun, `server/` dizinini deploy edin.
   - Tüm env değişkenlerini set edin (Adım 5'teki tablo + `NODE_ENV=production`).
   - Bir public domain üretin, health check'i (`/api/v1/health`) doğrulayın.
2. **Frontend → Vercel** (ya da tercih ettiğiniz statik hosting):
   - Yeni bir proje oluşturun, kök dizinden deploy edin (Vite otomatik algılanır).
   - `VITE_*` değişkenlerini set edin.
   - `vercel.json` (SPA rewrite) zaten repoda — dokunmanıza gerek yok, ama
     eşdeğer bir platform kullanıyorsanız orada da benzer bir "her yolu
     index.html'e yönlendir" kuralı gerekir.
3. Backend'in `CORS_ORIGINS`'ine Vercel'in verdiği **gerçek** adresi
   ekleyip backend'i yeniden deploy edin.

## Adım 9 — Rules/Index'leri Aktarma

Bu repodaki `firestore.rules`, `storage.rules`, `firestore.indexes.json`
**birebir aynı** kalır (müşteriye özel bir şey içermiyorlar) — Adım 2.4'te
yapıldığı gibi Console'dan yayınlamanız yeterli.

## Adım 10 — Doğrulama

`CHECKLIST.md`'deki tüm maddeleri işaretleyin. En azından: gerçek bir
tarayıcıdan anasayfa, ilan detay sayfası, admin girişi ve bir CRUD
işlemi (örn. müşteri oluşturma) test edilmeden "kurulum tamam" denmemeli.
