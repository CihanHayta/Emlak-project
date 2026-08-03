import PageBanner from "../components/common/PageBanner";
import { SITE } from "../config/siteConfig";
import "./Gizlilik.css";

/**
 * "/gizlilik-politikasi" — Gizlilik Politikası.
 *
 * Meta App Dashboard'ın "Publish" (yayınlama) adımı, Instagram DM
 * entegrasyonu kullanan uygulamalar için geçerli bir Privacy Policy URL
 * istiyor — bu sayfa o gereksinimi karşılamak için eklendi. İçerik
 * PLACEHOLDER'dır, ofis sahibinin gerçek adres/e-posta bilgileriyle ve
 * varsa bir avukat onayıyla güncellenmesi gerekir.
 */
export default function Gizlilik() {
  return (
    <>
      <PageBanner title="Gizlilik Politikası" subtitle={`${SITE.name} olarak kişisel verilerinizi nasıl işlediğimiz.`} />

      <section className="legal-page">
        <div className="legal-page__content">
          <p className="legal-page__updated">Son güncelleme: Ağustos 2026</p>

          <h2>1. Topladığımız Bilgiler</h2>
          <p>
            {SITE.name} olarak, sitemizdeki iletişim/başvuru formlarını doldurduğunuzda (ad, telefon, e-posta,
            ilgilendiğiniz ilan bilgisi gibi) ve bize Instagram üzerinden doğrudan mesaj (DM) gönderdiğinizde
            paylaştığınız bilgileri işleriz.
          </p>

          <h2>2. Instagram Mesajlaşma Entegrasyonu</h2>
          <p>
            Instagram işletme hesabımıza gönderdiğiniz mesajlar, Meta&apos;nın Instagram Messaging API&apos;si
            aracılığıyla güvenli şekilde bize iletilir ve yalnızca size daha hızlı yanıt verebilmek amacıyla dahili
            sistemimizde saklanır. Bu mesajlar üçüncü taraflarla paylaşılmaz, sadece yetkili ofis personelimiz
            tarafından görüntülenir.
          </p>

          <h2>3. Bilgilerinizi Nasıl Kullanıyoruz</h2>
          <p>
            Topladığımız bilgileri yalnızca talebinizle ilgilenmek, size ilan/randevu bilgisi sunmak ve
            hizmetlerimizi geliştirmek amacıyla kullanırız. Bilgileriniz izniniz olmadan pazarlama amacıyla üçüncü
            taraflara satılmaz veya kiralanmaz.
          </p>

          <h2>4. Veri Saklama</h2>
          <p>
            Verileriniz, yasal yükümlülüklerimiz ve meşru iş amaçlarımız için gerekli olduğu sürece saklanır.
            Verilerinizin silinmesini istediğinizde aşağıdaki iletişim bilgilerinden bize ulaşabilirsiniz.
          </p>

          <h2>5. Haklarınız</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında; verilerinize erişme, düzeltilmesini
            veya silinmesini talep etme hakkına sahipsiniz.
          </p>

          <h2>6. Bize Ulaşın</h2>
          <p>
            Gizlilik politikamızla ilgili sorularınız için{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a> adresinden bize ulaşabilirsiniz.
          </p>
        </div>
      </section>
    </>
  );
}
