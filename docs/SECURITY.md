# SECURITY.md — Güvenlik

## Genel İlke

Frontend **hiçbir zaman** Postgres'e ya da R2'ye doğrudan bağlanmaz — tüm
veri erişimi (okuma dahil), giriş dahil, kimlik doğrulanmış Express API
(`server/`) üzerinden geçer. Tarayıcıda sadece bir httpOnly oturum çerezi
tutulur, hiçbir credential (şifre, DB bağlantı dizesi, R2 anahtarı)
JavaScript'e hiç ulaşmaz. Bu, güvenlik modelinin merkezindeki karardır —
aşağıdaki her önlem bunun üzerine kurulu.

## Authentication

- E-posta + şifre, doğrudan backend'e (`POST /auth/login`) gider —
  Firebase Authentication (ya da başka bir üçüncü taraf kimlik servisi)
  YOK. Şifre `bcryptjs` ile hash'lenip `users.password_hash`'te tutulur
  (10 salt round) — düz metin şifre hiçbir zaman diskte/DB'de durmaz.
- Doğru şifre → 32 bayt (256 bit) rastgele bir oturum token'ı üretilir
  (`crypto.randomBytes`), SHA-256 hash'i `sessions` tablosuna yazılır, HAM
  token bir httpOnly çereze konur. Çerez tarayıcıdan asla JavaScript ile
  okunamaz; DB'de de sadece hash'i durur — DB'ye salt-okunur erişimi olan
  biri (ör. bir yedek dosyası sızarsa) tek başına hiçbir oturumu ele
  geçiremez, hash'ten ham token'a geri dönülemez.
- Token 256 bit entropiye sahip — tahmin/brute-force ihtimali pratikte
  sıfır, bu yüzden ayrı bir HMAC imzalama/`SESSION_SECRET` gibi bir env
  değişkenine gerek YOK (token'ın kendisi zaten yeterince rastgele).
- Cookie özellikleri (`server/src/controllers/auth.controller.js`):
  - `httpOnly: true` — JavaScript ile okunamaz, XSS'e karşı.
  - `secure: true` — sadece production/HTTPS'te (`NODE_ENV=production`).
  - `sameSite: "none"` (production) / `"lax"` (development) — bkz.
    aşağıdaki "Cross-Origin Cookie" bölümü.
- Her istekte `tenantId`/`role` **request body/query'den asla okunmaz** —
  `authMiddleware` çerezdeki token'ı `sessions` tablosunda doğrular, sonra
  `users` tablosundan CANLI satırı (role/status/tenantId) çeker. Bu son
  nokta önemli: bir rol değişikliği ya da hesabı pasife alma, açık
  oturumlarda bile bir SONRAKİ istekte ANINDA etkili olur — token
  içine gömülü, bayatlayabilecek bir "claim" yok.
- Şifre değiştiğinde/hesap pasife alındığında/hesap silindiğinde, o
  kullanıcının TÜM oturumları (her cihazda) hemen iptal edilir (bkz.
  `user.postgres.service.js`). Logout ise SADECE o tarayıcının oturumunu
  iptal eder (diğer cihazlara dokunmaz).
- İlk hesap (owner) `node scripts/bootstrap-owner.js <email> <şifre>` ile
  oluşturulur — kendi kendine kayıt yok. **Self-servis, e-posta tabanlı
  "şifremi unuttum" akışı bilinçli olarak kurulmadı**: tek bir owner var,
  `DATABASE_URL`'e erişimi olan (yani deployment'ın gerçek sahibi olan)
  kişi zaten `bootstrap-owner.js`'i yeniden çalıştırarak şifresini
  sıfırlayabiliyor. Ayrı bir SMTP/e-posta gönderme altyapısı kurmak,
  bu tehdit modelinde gerçek bir güvenlik kazancı sağlamadan (saldırı
  yüzeyini büyüten) bir bakım yükü ekler. Danışman/Personel/Kısıtlı
  hesaplarının şifresi zaten owner tarafından Ayarlar sayfasından
  sıfırlanabiliyor.

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

`server/src/middleware/authorize.middleware.js` + `server/src/config/permissions.js`
— 5 rol:

| Rol | Frontend etiketi | İzinler |
|---|---|---|
| `owner` | Admin | Her şey (`*`) — sadece `bootstrap-owner.js` ile oluşur |
| `admin` | — | Her şey (`*`) — Ayarlar'dan atanamaz, sadece owner'a eşdeğer bir rol tanımı |
| `agent` | Danışman | properties (read+write), vehicles (read+write), customers, appointments, conversations, leads (read+write), uploads |
| `assistant` | Personel | agent ile aynı, sadece `properties:write`/`vehicles:write` yok |
| `viewer` | Kısıtlı | Sadece okuma (properties/vehicles/customers/appointments/leads) |

`users:*` (Ayarlar → Kullanıcı yönetimi) **sadece** `owner`/`admin`'in
taban izninde (`*`) var, diğer rollere hiç eklenmedi — yani "sadece
admin" olması, ayrı bir kontrol değil, **o iznin başka hiçbir role hiç
verilmemiş olması**yla sağlanıyor. `agent`/`assistant` izinleri owner
tarafından tenant bazında özelleştirilebilir (`CUSTOMIZABLE_ROLES`),
`owner`/`admin`/`viewer` özelleştirilemez.

Kullanım: her route dosyasında `authorize("customers:write")` gibi bir
middleware zincire eklenir; `tenantMiddleware`'den SONRA bağlanmalı
(`req.context.role`'e ihtiyaç duyar).

## Rate Limiting

`server/src/middleware/rateLimit.middleware.js` — `express-rate-limit`,
bellek-içi (`MemoryStore`, tek instance için yeterli, yatay ölçeklenirse
Redis gibi paylaşımlı bir depo gerekir).

- **Global**: 300 istek / 15 dakika, tüm `/api/v1/*`.
- **Auth**: 20 istek / 15 dakika, **sadece** `POST /auth/login` (gerçek
  giriş denemesi — brute-force koruması burada anlamlı).
- `/auth/me` ve `/auth/logout` **genel** limite tabi, auth limitine değil
  — çünkü `/auth/me` neredeyse her sayfa yüklemesinde çağrılıyor ve
  geçerli bir session cookie zaten şart olduğu için brute-force riski
  taşımıyor.

## Yapılan Güvenlik Önlemleri (bulunup kapatılan gerçek açıklar, kronolojik)

1. **Upload uçları açıktı.** `/api/v1/uploads/*` başta kimlik doğrulaması
   istemiyordu — herkes internetten dosya yükleyebiliyordu. →
   `authMiddleware` + `tenantMiddleware` eklendi.
2. **RBAC yazılmış ama bağlanmamıştı.** `authorize()` middleware'i
   tamamen hazırdı ama hiçbir route'a eklenmemişti — herhangi bir role
   sahip biri (viewer dahil) her şeyi silebiliyordu. → Tüm route
   dosyalarına bağlandı, gerçek testle doğrulandı.
3. **Backend git'e hiç commit edilmemişti.** → Commit edildi.
4. **Depolama kotası kontrol edilmiyordu.** → `assertStorageWithinLimit`
   her yüklemeden önce kontrol ediyor.
5. **Rate limit paylaşımı** — yukarıda anlatıldı.
6. **Cross-origin cookie sorunu** — yukarıda anlatıldı.
7. **Firestore/Firebase Storage/Firebase Authentication tamamen
   kaldırıldı** (bkz. `HISTORY.md`) — üçüncü taraf bir kimlik/veri
   servisine olan bağımlılık sıfırlandı, tüm erişim kontrolü artık
   tek bir yerde (bu backend'de) yaşıyor. Bu geçişte API yanıtına şifre
   hash'i sızmasını önlemek özel bir dikkat konusuydu — bkz.
   `user.postgres.repository.js`'in `password_hash`'i asla dışarı
   vermeyen `#omitPasswordHash` deseni.

## Kod İçinde Sabit Yazılı Gizli Bilgi Var mı?

Hayır — proje kaynak kodu (`src/`, `server/src/`) tarandı, hiçbir yerde
sabit bir şifre, API key, DB bağlantı dizesi ya da R2 credential'ı
bulunmadı. Hepsi `.env`'den okunuyor (`DATABASE_URL`, `R2_*`,
`TOKEN_ENCRYPTION_KEY`, ...). `.env` dosyaları hem kök hem `server/`
`.gitignore`'unda — `git ls-files | grep -i env` sadece `.env.example`
dosyalarını göstermeli (onlar gerçek bir secret İÇERMEZ, sadece hangi
değişkenlerin gerektiğini dokümante eden şablonlardır).
