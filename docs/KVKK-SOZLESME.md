# KVKK-SOZLESME.md — Veri İşleyen Sözleşmesi (Taslak)

> ⚠️ **Bu bir taslak/şablondur, hukuki tavsiye değildir.** Gerçek bir
> müşteriyle imzalamadan önce bir avukata gösterin — özellikle "Sorumluluk
> ve Tazminat" ve "Yurt Dışına Aktarım" bölümleri işinizin büyüklüğüne ve
> Firebase projenizin veri merkezi bölgesine göre değişebilir.
>
> **Ne işe yarar:** Bu, sizin (yazılımı/altyapıyı işleten taraf) ile size
> CRM'i satın alan **her emlak ofisi müşterisi** arasında imzalanır. Amaç:
> o ofisin kendi müşterilerinin (ad/telefon/mesaj gibi) verisini sizin
> Firebase/Railway/Vercel altyapınızda tuttuğunuzu, KVKK'nın "veri sorumlusu
> – veri işleyen" ilişkisine göre resmileştirmek. `src/pages/Gizlilik.jsx`
> (public sitedeki Gizlilik Politikası) bununla **karıştırılmamalı** — o,
> emlak ofisinin KENDİ ziyaretçilerine karşı yükümlülüğü; bu belge ise
> sizinle emlak ofisi arasındaki B2B ilişki.

---

## KİŞİSEL VERİLERİN KORUNMASI VE İŞLENMESİNE İLİŞKİN SÖZLEŞME

Bu Sözleşme, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca,

**VERİ SORUMLUSU:** [Emlak Ofisi Ticari Unvanı], [Adres], [Vergi No] (bundan
böyle "**Müşteri**" olarak anılacaktır)

ile

**VERİ İŞLEYEN:** [Ad Soyad / Şirket Unvanınız], [Adres], [Vergi No/TCKN]
(bundan böyle "**Sağlayıcı**" olarak anılacaktır)

arasında, [TARİH] tarihinde, aşağıdaki şartlarla akdedilmiştir.

### 1. Konu ve Kapsam

Sağlayıcı, Müşteri'ye bir emlak ofisi yönetim yazılımı ("Yazılım") barındırma
(hosting) ve işletme hizmeti sunar. Müşteri, kendi müşterilerine/potansiyel
müşterilerine (lead) ait kişisel verileri Yazılım üzerinden toplar,
saklar ve işler; bu veriler Sağlayıcı'nın işlettiği Firebase (Google Cloud),
Railway ve Vercel altyapısında barınır. Bu Sözleşme, bu veri işleme
faaliyetinin KVKK m.8-9 kapsamındaki şartlarını düzenler.

### 2. Taraf Sıfatları

- **Müşteri**, kendi müşterilerinin/lead'lerinin verisi bakımından **veri
  sorumlusudur** — hangi verinin toplanacağına, hangi amaçla işleneceğine
  karar veren taraf odur.
- **Sağlayıcı**, sadece Müşteri'nin talimatı doğrultusunda (Yazılım'ın
  tasarlanmış işlevleri çerçevesinde) veri **işleyen** sıfatıyla hareket
  eder; veriyi kendi amaçları için kullanamaz.

### 3. İşlenen Veri Kategorileri

Ad-soyad, telefon numarası, e-posta (varsa), mesaj/not içeriği, ilgilenilen
ilan/randevu bilgisi, Instagram/WhatsApp kullanıcı adı ve bu kanallardan
gelen mesaj içerikleri. Sağlayıcı, bunların dışında ek bir veri kategorisi
toplamaz.

### 4. Sağlayıcı'nın Yükümlülükleri

- Veriyi yalnızca Müşteri'nin talimatı ve Yazılım'ın amacı doğrultusunda
  işler, kendi pazarlama/başka bir amaç için kullanmaz.
- Yazılım'a erişimi olan personelini gizlilik yükümlülüğü altına alır.
- Alınan teknik/idari tedbirler (özet, güncel durum için bkz. `SECURITY.md`):
  - Frontend hiçbir zaman veritabanına doğrudan bağlanmaz, tüm erişim
    kimlik doğrulamalı bir API üzerinden geçer.
  - Firestore/Storage güvenlik kuralları istemci tarafı erişimi tamamen
    kapalıdır (`deny-all`).
  - Oturum bilgisi `httpOnly`/`secure` çerezle taşınır.
  - Rol bazlı yetkilendirme (RBAC) ile her kullanıcı sadece yetkili
    olduğu veriye erişir.
  - Instagram/WhatsApp erişim anahtarları (token) veritabanında şifreli
    (AES-256-GCM) saklanır.
- Bir veri ihlali (yetkisiz erişim, sızıntı vb.) fark ettiğinde, **gecikmeksizin
  ve en geç 72 saat içinde** Müşteri'yi yazılı olarak bilgilendirir.
- Sözleşme sona erdiğinde, Müşteri'nin talebi üzerine tüm verileri Müşteri'ye
  aktarır ve/veya makul bir süre içinde siler (bkz. Madde 7).

### 5. Müşteri'nin Yükümlülükleri

- Kendi topladığı verinin hukuki sebebini (açık rıza, meşru menfaat vb.)
  ve KVKK m.10 uyarınca aydınlatma yükümlülüğünü (kendi web sitesindeki
  formlar/Gizlilik Politikası ile) yerine getirmekten bizzat sorumludur.
- Yazılım'a girdiği verinin doğruluğundan ve hukuka uygunluğundan sorumludur.

### 6. Alt İşleyenler

Sağlayıcı, hizmeti sunarken aşağıdaki alt işleyenleri/altyapı
sağlayıcılarını kullanır. Müşteri, bu Sözleşme'yi imzalayarak bu alt
işleyenlerin kullanımını kabul eder:

| Alt İşleyen | Rolü |
|---|---|
| Google Firebase / Google Cloud | Veritabanı (Firestore), dosya depolama (Storage), kimlik doğrulama |
| Railway | Backend (API) barındırma |
| Vercel | Frontend (web sitesi) barındırma |
| Meta (Instagram/WhatsApp) | Mesajlaşma entegrasyonu — sadece Müşteri kendi hesabını bağlarsa |

### 7. Verilerin Silinmesi/İadesi

Sözleşme herhangi bir sebeple sona erdiğinde, Sağlayıcı Müşteri'nin
talebi üzerine en geç [30] gün içinde tüm verileri kalıcı olarak siler
veya (Müşteri talep ederse) dışa aktarılabilir bir formatta (örn. CSV/JSON)
teslim eder. Yasal saklama yükümlülüğü olan veriler bu süreden istisnadır.

### 8. Yurt Dışına Aktarım

Firebase/Google Cloud altyapısı [FIREBASE PROJENİZİN BÖLGESİNİ YAZIN, örn.
"europe-west1 (Belçika)" ya da "us-central1 (ABD)"] bölgesinde barınmaktadır.
[Bölge Türkiye/AB dışındaysa:] Bu, KVKK m.9 kapsamında yurt dışına veri
aktarımı sayılabilir — Müşteri'nin kendi aydınlatma metninde buna açıkça
yer vermesi ve gerekiyorsa ilgili kişilerden ayrıca rıza alması önerilir.

### 9. Sorumluluk

Taraflardan her biri, kendi kusurundan doğan zarardan KVKK ve genel
hükümler çerçevesinde sorumludur. Sağlayıcı, Madde 4'te sayılan tedbirleri
almış olması kaydıyla, Müşteri'nin veya üçüncü kişilerin kendi kusurundan
(örn. zayıf şifre paylaşımı, yetkisiz kullanıcı ekleme) doğan zararlardan
sorumlu tutulamaz.

### 10. Süre ve Fesih

Bu Sözleşme, taraflar arasındaki asıl hizmet sözleşmesiyle eş süreli
yürürlüktedir ve o sözleşme sona erdiğinde kendiliğinden sona erer.

### 11. İmza

| Veri Sorumlusu (Müşteri) | Veri İşleyen (Sağlayıcı) |
|---|---|
| Ad Soyad / Unvan: | Ad Soyad / Unvan: |
| Tarih: | Tarih: |
| İmza: | İmza: |
