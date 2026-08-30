import { useState } from "react";
import { ShieldCheck, HandCoins, FileCheck2, Clock } from "lucide-react";
import { SERVICES } from "../../data/services";
import ServiceRequestModal from "../common/ServiceRequestModal";
import "./ServiceHighlights.css";

// Maps the plain-string `icon` key from data/services.js to an actual
// lucide-react icon component (keeps the data file JSX-free).
const ICONS = {
  "shield-check": ShieldCheck,
  "hand-coins": HandCoins,
  "file-check": FileCheck2,
  clock: Clock,
};

/**
 * The 4 clickable service cards (Ücretsiz Ekspertiz / Kredi Danışmanlığı /
 * Tapu Takip Süreci / 7/24 Destek). Clicking any card opens the shared
 * request-form popup (ServiceRequestModal) pre-tagged with that service's
 * title, so the same 4 cards double as lead-generation entry points.
 */
export default function ServiceHighlights() {
  // Which service card was clicked, if any — drives which popup is shown.
  const [activeService, setActiveService] = useState(null);

  return (
    <section className="service-highlights">
      <div className="service-highlights__grid">
        {SERVICES.map((service) => {
          const Icon = ICONS[service.icon];
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setActiveService(service)}
              className="service-highlights__card"
            >
              <span className="service-highlights__icon">
                <Icon className="icon-6" />
              </span>
              <h3 className="service-highlights__title">{service.title}</h3>
              <p className="service-highlights__desc">{service.description}</p>
            </button>
          );
        })}
      </div>

      <ServiceRequestModal
        isOpen={activeService !== null}
        onClose={() => setActiveService(null)}
        serviceTitle={activeService?.title}
      />
    </section>
  );
}
