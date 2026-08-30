# HISTORY.md — Kuruluş Sırası ve Gerekçeler

> Proje şu sırayla, her adım bir öncekinin üzerine oturacak şekilde inşa
> edildi. Kronolojik olarak okumak, projenin nasıl bu hale geldiğini
> anlamanın en hızlı yolu — `git log --oneline` ile commit mesajlarını da
> aynı sırayla okuyabilirsiniz, her biri "neden" yapıldığını anlatacak
> şekilde yazıldı.

| # | Adım | Neden bu sırada? |
|---|------|-------------------|
| 1 | Public site + admin panel (React/Vite), tamamı localStorage/statik veri ile | Projenin başlangıç noktası — önce arayüz ve ürün akışı oturtuldu, backend olmadan da demo edilebilsin diye. |
| 2 | Video yükleme sorunu fark edildi (IndexedDB tarayıcıya hapsoluyor, başka cihazdan görünmüyor) | Bu, "gerçek backend şart" kararını tetikledi — localStorage/IndexedDB'nin cihazlar arası çalışmadığı somut olarak görüldü. |
| 3 | Firebase projesi oluşturuldu (`emlakcrm25`), Admin SDK servis hesabı anahtarı alındı | Backend'in Firestore/Storage/Auth'a bağlanabilmesi için önce bir Firebase projesi ve ona erişim kimlik bilgisi gerekiyor. |
| 4 | Backend iskeleti kuruldu: `config/`, `logger`, `middleware`, `utils`, `/health` — **mock modda** (`FIREBASE_MODE=mock`) | Firebase Console'da henüz hiçbir servis açılmamışken bile backend'in ayakta kalıp test edilebilmesi için — gerçek Firebase'e bağımlı olmadan iskelet doğrulandı. |
| 5 | Firebase Console'da Authentication + Firestore + Storage etkinleştirildi | Backend gerçek veriye geçmeden önce bu üç servisin Console'da "Get Started" ile açılması şart — aksi halde Admin SDK "bucket/database yok" hatası verir. |
| 6 | Çok-kiracılı veri izolasyonu kuruldu: `BaseRepository` (private `#collection` + zorunlu `tenantId` kontrolü), `tenant.middleware.js` | Herhangi bir domain (müşteri, randevu...) yazılmadan ÖNCE bu temel atıldı — sonradan eklemek, her yeri tek tek gözden geçirmeyi gerektirirdi. |
| 7 | Gerçek kimlik doğrulama: Firebase Auth + httpOnly session cookie | Hiçbir veri ucu (customers, appointments...) kimliksiz açılamayacağı için, ilk domain'den önce auth akışı tamamlanmalıydı. |
| 8 | `scripts/bootstrap-owner.js` ile ilk gerçek owner hesabı oluşturuldu | Sistemde "giriş yapabilecek biri" olmadan hiçbir korumalı uç test edilemez. |
| 9 | Müşteriler (Customers) → gerçek backend'e taşındı | İlk taşınan domain — CRM'in en temel nesnesi, ve diğer domainlerin (randevu, ilan) referans verdiği ana kayıt. |
| 10 | Başvurular (Leads) → gerçek backend'e taşındı, public form uçları eklendi | Public site'tan kimliksiz gelen form kayıtlarının admin panelde görünmesi gerekiyordu. |
| 11 | Randevular (Appointments) → gerçek backend'e taşındı, silme özelliği eklendi | Müşteri kartı hazır olduktan sonra ona bağlı randevular taşındı. |
| 12 | Public site formları gerçek hata/loading durumlarıyla backend'e bağlandı | Ziyaretçi tarafında "gönderildi" sanıp aslında kaydolmayan formların önüne geçildi. |
| 13 | **SaaS satışa hazırlık denetimi** — 5 kritik güvenlik açığı bulundu | Randevu/müşteri/lead gibi "asıl" özellikler bittikten sonra, satılabilir bir ürün olup olmadığı test edildi. |
| 14 | 5 kritik açık kapatıldı (bkz. `SECURITY.md`) | Denetimde bulunan sıraya göre, en riskli olandan başlanarak kapatıldı. |
| 15 | **İş modeli pivotu**: kendi kendine firma kaydı kaldırıldı, iki test tenant'ından biri silindi | Kullanıcı ürünü "tek firma, satış başına ayrı Firebase projesi" modeliyle satacağını netleştirdi. |
| 16 | Firebase config tek noktaya toplandı: `src/firebase/{config,auth,firestore,storage}.js` | Pivot sonrası "yeni müşteride sadece bir dosya + `.env` değişsin" hedefi için gerekliydi. |
| 17 | Gerçek Personel/Danışman yönetimi eklendi | Firma sahibi tek kişi olduğuna göre, ekibindeki diğer kişilerin gerçek hesapları olması gerekiyordu. |
| 18 | Giriş ekranına rol sekmesi + "Beni Hatırla" eklendi | Yeni kullanıcı tipleri geldiği için giriş akışının da onları yansıtması gerekiyordu. |
| 19 | Ses + anlık bildirimler eklendi | Ekip birden fazla kişi olabileceği için "birisi bir şey yaptığında haberim olsun" ihtiyacı doğdu. |
| 20 | **İlanlar → gerçek backend'e taşındı** — en büyük migrasyon (253 örnek ilandan 234'ü silindi, kalan 19'u Firestore'a taşındı) | Denetimde "en büyük kalan eksik" olarak işaretlenmişti. |
| 21 | Firestore + Storage Security Rules yazılıp deploy edildi | İlanlar da taşındığından artık TÜM veri Firestore'daydı — ikinci savunma katmanı için doğru zamandı. |
| 22 | Composite index ihtiyacı incelendi — hiçbirine gerek olmadığı tespit edildi | Rules deploy edilirken aynı zamanda index dosyası da gerekiyordu. |
| 23 | Firestore otomatik yedekleme kuruldu | Artık gerçek, geri dönüşü olmayan veri Firestore'da olduğu için yedekleme şart hale gelmişti. |
| 24 | **Production deploy**: Backend → Railway, Frontend → Vercel | Kod ve altyapı hazır olduğuna göre, projeyi gerçekten erişilebilir hale getirme sırası gelmişti. |
| 25 | Deploy sonrası bulunan 2 gerçek hata düzeltildi: SPA routing, cross-origin cookie | Bunlar sadece gerçek bir production ortamında ortaya çıkabilecek hatalardı. |
| 26 | GitHub'a push edildi | Kod hem çalışıyor hem canlıda doğrulanmış olduğu için uzak depoya yansıtıldı. |
| 27 | **İş modeli tekrar netleşti**: paylaşımlı backend/Meta App + per-tenant federe Firebase projesi modeli terk edildi, **tek-kiracılı, satış başına TAMAMEN ayrı deployment** (kendi backend'i + kendi veritabanı + kendi dosya deposu) modeline geçildi | Per-tenant Firebase projesi yönetimi (her müşteride ayrı bir Google faturası, ayrı bir rules/backup kurulumu) operasyonel olarak fazla karmaşık çıktı — tam bağımsız deployment hem daha basit hem daha izole. |
| 28 | **Firestore → PostgreSQL migrasyonu** — tüm domain'ler (tenants/properties/customers/leads/appointments/vehicles/conversations/messages/funnels/automation_events/users) gerçek tablolara, gerçek foreign key'lere taşındı | Adım 27'deki pivottan sonra artık "hangi Firebase projesine bağlanılacak" sorusu ortadan kalktığı için, gerçek sorgulama/transaction/foreign-key garantisi veren bir veritabanına geçmenin önü açıldı. |
| 29 | **Firebase Storage → Cloudflare R2 migrasyonu** — presigned-URL upload akışına geçildi (tarayıcı R2'ye doğrudan yazar, backend dosyanın baytlarına hiç dokunmaz) | Aynı pivotun dosya deposu ayağı — Postgres'e taşınan `property_media`/`vehicle_media` tabloları zaten R2 object key'lerini tutacak şekilde tasarlandı. |
| 30 | Kod tabanındaki ölü Firestore/Firebase Storage kalıntıları (eski repository/service dosyaları, mock'lar, `firestore.rules`/`storage.rules`, kullanılmayan genel upload ucu) temizlendi | Kod seviyesindeki cutover tamamlanmıştı ama eski dosyalar hâlâ diskteydi — gerçekten "Firestore/Storage'a bağımlılık sıfır" diyebilmek için silinmeleri gerekiyordu. |
| 31 | **Firebase Authentication → Postgres-native kimlik doğrulama** — `users.password_hash` (bcrypt) + `sessions` tablosu (SHA-256 hash'lenmiş rastgele token'lar) | Firestore ve Storage'dan sonra kalan TEK Firebase bağımlılığıydı. Kaldırılınca proje artık hiçbir üçüncü taraf veri/kimlik servisine bağımlı değil — sadece Postgres + R2 + (opsiyonel) Meta API. |
| 32 | `docs/` klasörü baştan sona güncel mimariye (Postgres + R2 + Postgres-native auth) göre yeniden yazıldı | Dokümantasyon adım 27-31'in HİÇBİRİNİ yansıtmıyordu — özellikle `BACKUP.md` artık var olmayan bir Firebase Console sayfasına yönlendiriyordu, aktif olarak yanıltıcıydı. |

Detaylar için: mimari kararlar → `ARCHITECTURE.md`, güvenlik → `SECURITY.md`,
veri modeli → `DATA-MODEL.md`, yedekleme → `BACKUP.md`, yeni kurulum →
`INSTALL.md`, kontrol listesi → `CHECKLIST.md`.
