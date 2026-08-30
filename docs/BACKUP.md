# BACKUP.md — Yedekleme ve Kurtarma

> Bu doküman daha önce (Firestore döneminde) tamamen Firebase Console'a
> dayanıyordu. Firestore artık projede yok — aşağıdaki iki bölüm birbirinden
> BAĞIMSIZ: veritabanı (Postgres) ve dosya depolama (R2) tamamen farklı
> ürünler, farklı yedekleme mekanizmaları var. Birini yedeklemek diğerini
> yedeklemez.

## PostgreSQL (iş verisi + kullanıcı hesapları)

Kalıcı, geri dönüşü olmayan TÜM iş verisi (properties/customers/leads/
appointments/vehicles/conversations/messages/funnels/automation_events/
users/sessions/tenants — bkz. `DATA-MODEL.md`) burada. `sessions` hariç
hepsi kayıp durumunda telafisi imkansız veri.

**Nereden kurulur/değiştirilir:** `DATABASE_URL`'in işaret ettiği Postgres
sağlayıcısının kendi konsolundan (ör. Railway → Postgres servisi →
Settings/Backups sekmesi, ya da başka bir yönetilen sağlayıcı kullanıyorsanız
onun kendi backup arayüzü). **Bu proje bu adımı sizin için otomatik
kurmuyor** — kullandığınız sağlayıcıya göre elle etkinleştirilmesi gerekir.

**Önerilen minimum:** Günlük otomatik snapshot, en az 7 gün saklama; mümkünse
haftalık snapshot'ları 30+ gün saklayın (geç fark edilen sorunlar için).

**Elle yedek almak isterseniz** (sağlayıcı yönetimli backup'a ek olarak, ya
da onun yerine):
```bash
pg_dump "$DATABASE_URL" -F c -f yedek-$(date +%Y%m%d-%H%M).dump
```
Geri yüklemek için:
```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists yedek-TARIH.dump
```
`--clean --if-exists` var olan tabloları önce düşürüp yeniden kurar — BOŞ
bir veritabanına ya da tamamen üzerine yazmayı göze aldığınız bir ortama
karşı çalıştırın, canlı bir veritabanına doğrudan restore etmeden önce
mutlaka önce ayrı bir (test) veritabanında deneyin.

**Migration güvenliği:** `npm run db:migrate` (server/) her zaman
`server/migrations/`'daki şemayı SIRAYLA, zaten uygulanmışları atlayarak
çalıştırır (bkz. `node-pg-migrate`) — production'da yeni bir migration
uygulamadan önce güncel bir yedek almak, migration'ın yanlış çıkması
ihtimaline karşı standart pratiktir.

## Cloudflare R2 (fotoğraf/video/belge dosyaları)

Postgres'teki satırlar (ör. `property_media.object_key`) sadece R2'deki
dosyalara birer İŞARETÇİdir — asıl dosyanın kendisi burada değil, R2'de
durur. Postgres'i yedeklemek R2'deki dosyaları YEDEKLEMEZ, ikisi TAMAMEN
ayrı sistemlerdir.

R2'nin Firestore'daki gibi bir "Scheduled backups" özelliği yok. Öneriler
(bu proje kapsamında HENÜZ kurulmadı, bilinen bir eksik olarak not
düşülüyor):
- **Object Versioning** — Cloudflare Dashboard → R2 → bucket → Settings →
  "Object Versioning" açılırsa, üzerine yazılan/silinen bir dosyanın önceki
  sürümü belirli bir süre saklanır (yanlışlıkla silme/üzerine yazmaya karşı).
- **Bucket-to-bucket replikasyon/sync** — periyodik olarak (ör. bir cron
  job'unda) `rclone sync` gibi bir araçla asıl bucket'tan ayrı bir yedek
  bucket'a (mümkünse farklı bir Cloudflare hesabında ya da en azından
  farklı bir bucket'ta) senkronize edilebilir.

**Kritik olan tek bilgi:** dosyanın kendisi sadece R2'de var — Postgres'teki
satır silinirse ama R2'deki dosya kalırsa, o dosya artık hiçbir yerden
referans edilmeyen "yetim" bir obje olarak R2 faturanızda kalmaya devam
eder (zararsız ama gereksiz maliyet); tersi durumda (R2'deki dosya
kaybolur ama Postgres satırı kalırsa) uygulama o fotoğrafı/videoyu
göstermeye çalışıp 404 alır. İkisi ayrı yedeklenmediği sürece bu tutarsızlık
riski hep var.

## Kullanıcı hesapları ve şifreler

`users.password_hash` (bcrypt) Postgres yedeğinin doğal bir parçası —
ayrı bir adım gerekmez. Owner kendi şifresini unutursa (ya da tüm veritabanı
bir restore'dan sonra eski bir duruma dönerse), `DATABASE_URL`'e erişimi
olan biri `node scripts/bootstrap-owner.js <email> <yeni-şifre>` ile owner
şifresini sıfırlayabilir (bkz. `server/README.md`).

## Production'a Çıkmadan Önce

Bkz. `CHECKLIST.md` — backup ile ilgili maddeler orada da tekrar var,
tek bir yerde unutulmasın diye.
