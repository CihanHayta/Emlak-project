import { useState } from "react";
import IncomingLeads from "../components/IncomingLeads";
import CustomerSheet from "../components/CustomerSheet";
import { removeLead } from "../../lib/leadStore";

/**
 * "/admin/basvurular" — where every public-site form submission lands the
 * moment it's sent (service request popup, İletişim page, listing inquiry
 * form — see lib/leadStore.js). The agent triages each one with a status
 * (Arandı / Bilgi Bekliyor) and, when ready, turns it into a full customer
 * card via the same CustomerSheet used on the Müşteriler page.
 */
export default function Basvurular() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefill, setPrefill] = useState({});

  function handleConvertLead(lead) {
    removeLead(lead.id);
    setPrefill({ name: lead.name, phone: lead.phone, notes: lead.message, source: "Web Sitesi" });
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <IncomingLeads onConvert={handleConvertLead} />

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customer={null}
        prefill={prefill}
      />
    </div>
  );
}
