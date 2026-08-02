# BACKUP.md — Yedekleme ve Kurtarma

## Backup Nasıl Alınır

**Otomatik** — elle bir şey yapmanız gerekmiyor, bir kere kurulduktan
sonra kendi kendine çalışır.

- **Nereden kurulur/değiştirilir:** Firebase Console → Firestore Database
  → sol menüden **Backups** (URL: `console.firebase.google.com/project/{proje-id}/firestore/backups`).
- **Ne seçilir:** "Scheduled backups" altında **Daily** ve **Weekly**
  kutucukları işaretlenir. Her biri için "Days until backups expire"
  (kaç gün saklansın) girilir.
- **Bu projedeki mevcut ayar:** Daily → 7 gün, Weekly → Monday, 7 gün.
- **Neden yapılır:** Firestore'da yanlışlıkla silinen/bozulan veriyi
  geri getirebilmenin **tek** yolu bu. Varsayılan olarak Firestore
  **hiçbir otomatik yedek almaz** — bu adım atlanırsa bir veri
  kaybı/bozulma durumunda geri dönecek hiçbir nokta olmaz.
- **Değiştirmek isterseniz:** Aynı sayfada mevcut programın yanındaki
  düzenle ikonu → gün sayısını değiştir → Save.

**Önerilen minimum:** Daily en az 7 gün (yakın zamanda fark edilecek
hatalar için), Weekly en az 30-90 gün (geç fark edilen sorunlar için).
Sadece Daily açıkken Weekly kapalıysa (ya da tam tersi), koruma
penceresi daralır — ikisi birlikte, farklı sürelerle en iyi sonucu verir.

## Restore Nasıl Yapılır

> ⚠️ Bu adımlar Firebase'in resmi arayüz akışına göre yazıldı, bu proje
> sürecinde **fiilen denenmedi** — sadece backup'ların "Active" göründüğü
> doğrulandı. Gerçek bir restore öncesi mutlaka önce test ortamında
> (ayrı bir Firebase projesinde) denenmesi önerilir.

1. Console → Firestore → **Backups** sekmesi → geri yüklemek istediğiniz
   tarihli yedeği bulun.
2. Yedeğin yanındaki "Restore" seçeneğine tıklayın.
3. Firestore, bir yedeği **var olan bir veritabanının üzerine değil, YENİ
   bir veritabanına** geri yükler (`(default)`'ın üzerine yazmaz) — bu
   yüzden restore sonrası ya uygulamayı o yeni veritabanına
   yönlendirmeniz ya da manuel bir veri taşıma yapmanız gerekebilir.
4. Restore süresi veri boyutuna göre dakikalar sürebilir.

## Storage Yedekleme

Firebase Storage'ın Firestore'daki gibi bir "Scheduled backups" özelliği
**yok**. Storage'daki dosyalar (ilan fotoğraf/videoları) için ayrı bir
yedekleme kurulmadı bu proje sürecinde. İsterseniz Google Cloud Storage'ın
kendi "Object Versioning" ya da bir bucket'tan diğerine periyodik
`gsutil rsync` gibi bir çözüm eklenebilir — bu proje kapsamında **yapılmadı**,
bilinen bir eksik olarak not düşülüyor.

## Production'a Çıkmadan Önce

Bkz. `CHECKLIST.md` — backup ile ilgili maddeler orada da tekrar var,
tek bir yerde unutulmasın diye.
