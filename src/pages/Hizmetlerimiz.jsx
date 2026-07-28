import PageBanner from "../components/common/PageBanner";
import ServiceHighlights from "../components/home/ServiceHighlights";
import { SITE } from "../config/siteConfig";

/**
 * "/hizmetlerimiz" — Services page.
 *
 * Reuses the exact same <ServiceHighlights /> component shown on the
 * homepage (4 clickable cards -> request-form popup), so the click-to-form
 * behavior stays consistent wherever it appears instead of being
 * re-implemented per page.
 */
export default function Hizmetlerimiz() {
  return (
    <>
      <PageBanner
        title="Hizmetlerimiz"
        subtitle={`${SITE.name} olarak alım, satım ve kiralama sürecinizin her adımında yanınızdayız.`}
      />
      <div className="pt-14">
        <ServiceHighlights />
      </div>
    </>
  );
}
