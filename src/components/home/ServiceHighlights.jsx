import { useState } from "react";
import { ShieldCheck, HandCoins, FileCheck2, Clock } from "lucide-react";
import { SERVICES } from "../../data/services";
import ServiceRequestModal from "../common/ServiceRequestModal";

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
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service) => {
          const Icon = ICONS[service.icon];
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setActiveService(service)}
              className="flex flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="font-bold text-brand-navy">{service.title}</h3>
              <p className="text-sm text-gray-500">{service.description}</p>
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
