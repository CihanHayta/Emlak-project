# SECURITY.md — Güvenlik

## Genel İlke

Frontend **hiçbir zaman** Firestore/Storage'a doğrudan bağlanmaz — sadece
giriş yaparken Firebase Auth'un client SDK'sını kullanır (idToken almak
için). Tüm veri erişimi (okuma dahil) kimlik doğrulanmış Express API
(`server/`) üzerinden, Admin SDK ile geçer. Bu, güvenlik modelinin
merkezindeki karardır — aşağıdaki her önlem bunun üzerine kurulu.

## Firestore Rules / Storage Rules

İkisi de **`deny-all`**:

```
# firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

```
# storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Neden `false`?** Admin SDK (backend'in kullandığı) bu kuralları zaten
bypass eder — günlük kullanımı hiç etkilemez. Kuralın TEK amacı: sitenin
JavaScript'inde duran (gizli olmayan, olamayan — bkz. aşağıki "API Key
Neden Gizli Değil") Firebase config değerlerini ele geçiren birinin,
backend'i hiç kullanmadan doğrudan Firestore/Storage'a bağlanmasını
engellemek. Kilit kapıda, anahtarda değil.

**Nasıl deploy edilir:** Firebase Console → Firestore/Storage → Rules
sekmesi → yapıştır → Publish. (Bu proje sürecinde Firestore rules'ı
Firebase Rules REST API'sine servis hesabı OAuth token'ıyla doğrudan
istek atarak deploy ettik, çünkü `firebase-tools` CLI'sinin `deploy`
komutu servis hesabının sahip olmadığı bir "Service Usage" iznini
önkontrol olarak istiyordu. Storage rules'ta "ruleset oluşturma" API
üzerinden başarılı oldu ama "release/yayına alma" adımı ayrı bir izin
istediği için Console'dan elle yapıldı. Yeni bir müşteri kurulumunda en
basit yol doğrudan Console'dur.)

**Doğrulama:** Tarayıcı konsolundan (ya da bir Node script'iyle) doğrudan
`getDocs(collection(db, "customers"))` çağırmayı deneyin — `permission-denied`
almalısınız. Bu proje sürecinde bu test gerçekten yapıldı ve doğrulandı.

## API Key Neden "Gizli" Değil (sık sorulan bir soru)

Firebase'in client-side "API key"i, geleneksel bir gizli API key
(örn. bir ödeme sistemi key'i) gibi değildir — o tür key'ler "bu key'i
bilen her şeyi yapabilir" mantığındadır ve mutlaka gizlenir. Firebase'in
key'i sadece "bu istek hangi projeden geliyor" diyen bir **etiket**.
Kimin ne yapabileceğine asıl karar veren: (1) kimlik doğrulama, (2)
yukarıdaki Security Rules. Bu yüzden bu değerler `.env`'de "gizli" olarak
işaretlenmez ve frontend build'ine gömülmesi normaldir — Google'ın kendi
resmi dokümantasyonu da bunu açıkça belirtir.

**Ekstra, isteğe bağlı bir sertleştirme:** Google Cloud Console'da bu
API key'i "sadece belirli domain'lerden gelen isteklerde çalışsın" diye
kısıtlamak (HTTP referrer restriction) mümkündür — key'i gizlemez ama
biri kopyalayıp kendi sitesinde kullanmaya çalışırsa işe yaramaz hale
getirir.

## Authentication

- Firebase Authentication (email/password) + backend'in ürettiği
  **httpOnly session cookie** (`createSessionCookie`/`verifySessionCookie`
  — Firebase Admin SDK, ayrı bir JWT kütüphanesi kullanılmadı).
- Cookie özellikleri:
  - `httpOnly: true` — JavaScript ile okunamaz, XSS'e karşı.
  - `secure: true` — sadece production/HTTPS'te (`NODE_ENV=production`).
  - `sameSite: "none"` (production) / `"lax"` (development) — bkz.
    aşağıdaki "Cross-Origin Cookie" bölümü.
- Custom claims (`tenantId`, `role`) idToken'a gömülür, `auth.middleware.js`
  bunu her istekte doğrular — **asla** request body'sinden güvenilmez.

## Cross-Origin Cookie (önemli, canlıda gerçekten yaşandı)

Frontend (Vercel) ve backend (Railway) farklı domain'lerde — tarayıcı için
bu gerçek bir "cross-site" istek. `SameSite=Lax` cookie'ler cross-site
fetch/XHR isteklerinde **hiç gönderilmez** (sadece üst düzey navigasyonda
gönderilir). Local geliştirmede (`localhost:5173` ↔ `localhost:4000`) bu
sorun görünmez çünkü ikisi de "localhost" olduğu için tarayıcı bunu
same-site sayar. Production'a çıkınca (farklı gerçek domain'ler) giriş
"başarılı" görünür ama sonraki her istek sessizce 401 döner.

**Çözüm** (`server/src/controllers/auth.controller.js`):
```js
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  path: "/",
};
```
`SameSite=None` için `Secure=true` şart (tarayıcı zorunlu kılıyor) — bu
yüzden dev'de (`http://localhost`, `Secure=false`) `None` kullanılamaz,
orada `Lax` zaten yeterli çünkü gerçek anlamda same-site.

## Yetkilendirme (RBAC)

`server/src/middleware/authorize.middleware.js` — 3 rol:

| Rol | Frontend etiketi | İzinler |
|---|---|---|
| `owner` | Admin | Her şey (`*`) |
| `agent` | Danışman | properties (read+write), customers, appointments, conversations, leads (read+write), uploads |
| `assistant` | Personel | agent ile aynı, sadece `properties:write` yok |

`users:*` (Ayarlar → Kullanıcı yönetimi) **sadece** `owner`'ın taban
izninde (`*`) var, diğer rollere hiç eklenmedi — yani "admin-only" olması,
ayrı bir kontrol değil, **o iznin başka hiçbir role hiç verilmemiş
olması**yla sağlanıyor.

Kullanım: her route dosyasında `authorize("customers:write")` gibi bir
middleware zincire eklenir; `tenantMiddleware`'den SONRA bağlanmalı
(`req.context.role`'e ihtiyaç duyar).

## Rate Limiting

`server/src/middleware/rateLimit.middleware.js` — `express-rate-limit`,
bellek-içi (`MemoryStore`, tek instance için yeterli, yatay ölçeklenirse
Redis gibi paylaşımlı bir depo gerekir).

- **Global**: 300 istek / 15 dakika, tüm `/api/v1/*`.
- **Auth**: 20 istek / 15 dakika, **sadece** `POST /auth/session` (gerçek
  giriş denemesi — brute-force koruması burada anlamlı).
- `/auth/me` ve `/auth/logout` **genel** limite tabi, auth limitine değil
  — çünkü `/auth/me` neredeyse her sayfa yüklemesinde çağrılıyor ve
  geçerli bir session cookie zaten şart olduğu için brute-force riski
  taşımıyor. Bu ayrım sonradan eklendi çünkü başta ikisi aynı bütçeyi
  paylaşıyordu ve normal kullanımda bile "çok fazla istek" hatası
  çıkabiliyordu.

## Yapılan Güvenlik Önlemleri (bulunup kapatılan gerçek açıklar, kronolojik)

1. **Upload uçları açıktı.** `/api/v1/uploads/*` başta kimlik doğrulaması
   istemiyordu (kod içinde "Faz 3'te eklenecek" yorumu unutulmuştu) —
   herkes internetten dosya yükleyebiliyordu. → `authMiddleware` +
   `tenantMiddleware` eklendi, dosya yolu tenant'a bağlandı
   (`tenants/{tenantId}/...`).
2. **RBAC yazılmış ama bağlanmamıştı.** `authorize()` middleware'i
   tamamen hazırdı ama hiçbir route'a eklenmemişti — herhangi bir role
   sahip biri (viewer dahil) her şeyi silebiliyordu. → Tüm route
   dosyalarına bağlandı, gerçek testle (viewer'ın yazamadığı, owner'ın
   yapabildiği) doğrulandı.
3. **Backend git'e hiç commit edilmemişti.** `server/` diskte tek
   kopyaydı. → Commit edildi.
4. **Depolama kotası kontrol edilmiyordu.** `plan.limits.storageMb`
   hiçbir yerde okunmuyordu. → `assertStorageWithinLimit` her
   yüklemeden önce kontrol ediyor.
5. **Rate limit paylaşımı** — yukarıda anlatıldı.
6. **Firestore/Storage'a doğrudan istemci erişimi hiç engellenmemişti.**
   → `deny-all` rules deploy edildi.
7. **Cross-origin cookie sorunu** — yukarıda anlatıldı.

## IAM (Servis Hesabı Yetkileri)

- **Nereden görülür/değiştirilir:** Google Cloud Console → **IAM & Admin
  → IAM** (Firebase Console'da değil, ayrı bir GCP Console ekranı).
- **Bugünkü durum:** Admin SDK'nın kullandığı servis hesabı
  (`firebase-adminsdk-fbsvc@{proje}.iam.gserviceaccount.com`),
  Firestore/Storage/Auth üzerinde **veri okuma-yazma** için yeterli role
  sahip (proje oluşturulurken Firebase'in kendisi atıyor). **Ama** bu
  hesabın "Service Usage" (API etkin mi kontrolü) ve "yeni bir Firebase
  Rules release'i oluşturma" gibi proje-altyapısı yönetimi izinleri
  **yok** — bu proje sürecinde bizzat karşılaşıldı (rules deploy ederken
  `firebase-tools` CLI'si 403 verdi, doğrudan REST API'ye geçilerek
  aşıldı).
- **Neden önemli:** İleride CI/CD'den otomatik `firebase deploy`
  çalıştırmak isterseniz, ya bu servis hesabına **Editor** ya da en
  azından **Firebase Rules Admin** + **Service Usage Consumer**
  rollerini GCP Console'dan eklemeniz gerekir, ya da kendi Google
  hesabınızla `firebase login` yapıp CLI'yi öyle çalıştırmanız gerekir.
- **Yapılmazsa ne olur:** Günlük kullanımda hiçbir şey (uygulama zaten
  çalışıyor) — sadece CLI ile rules/index/backup gibi altyapı
  işlemlerini otomatikleştirmek isterseniz aynı 403 duvarına çarparsınız.

## Billing

- **Nereden görülür:** Firebase Console → sol altta çark ikonu →
  **Usage and billing**, ya da GCP Console → Billing.
- **Bu proje için gereken:** **Blaze (kullandıkça öde) plan.** Storage
  ürünü Spark (ücretsiz) planda hiç açılamıyor — yeni bir müşteri
  kurulumunda bu, ilk yapılacak işlerden biri (bkz. `INSTALL.md` Adım 1).
- **Yapılmazsa ne olur:** Storage hiç açılamaz; Firestore'un ücretsiz
  kotasını (günde ~50K okuma, ~20K yazma gibi) aşan istekler reddedilmeye
  başlar — küçük bir CRM'de bile bu kota gerçek kullanımda beklenenden
  hızlı dolabilir.

## Kod İçinde Sabit Yazılı Gizli Bilgi Var mı?

Hayır — proje kaynak kodu (`src/`, `server/src/`) tarandı, hiçbir yerde
sabit bir Firebase proje id'si, API key ya da servis hesabı bilgisi
bulunmadı. Hepsi `.env`'den okunuyor. `.env` ve servis hesabı JSON'ları
hem kök hem `server/` `.gitignore`'unda — `git ls-files | grep -i env`
boş dönmeli (sadece `.env.example` dosyaları görünür, onlar placeholder).
