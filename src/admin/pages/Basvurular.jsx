import { useState } from "react";
import { toast } from "sonner";
import IncomingLeads from "../components/IncomingLeads";
import CustomerSheet from "../components/CustomerSheet";
import AppointmentFormDialog from "../components/AppointmentFormDialog";
import { updateLeadStatus } from "../../lib/leadStore";
import { addCustomer } from "../data/customerStore";
import { SERVICES } from "../../data/services";

/**
 * A lead's `context` says which form it came from (see lib/leadStore.js) —
 * one of the 4 service-request-popup titles (e.g. "Kredi Danışmanlığı"), a
 * listing's title, or "İletişim Formu". Maps that to a `Kaynağı` value the
 * customer card actually recognizes (see LEAD_SOURCES in data/constants.js)
 * instead of flattening every public-site lead into a generic "Web Sitesi".
 */
function resolveLeadSource(context) {
  const matchedService = SERVICES.find((service) => service.title === context);
  return matchedService ? matchedService.title : "Web Sitesi";
}

// Same match, but against the appointment's "Randevu Konusu" options (see
// APPOINTMENT_SERVICE_TYPES in data/constants.js) — so a lead that came in
// asking about "Kredi Danışmanlığı" pre-fills that as the appointment's
// subject too, instead of always defaulting to "İlan Gösterimi".
function resolveServiceType(context) {
  const matchedService = SERVICES.find((service) => service.title === context);
  return matchedService ? matchedService.title : "İlan Gösterimi";
}

/**
 * "/admin/basvurular" — where every public-site form submission lands the
 * moment it's sent (service request popup, İletişim page, listing inquiry
 * form — see lib/leadStore.js). The agent triages each one with a status
 * (Arandı / Bilgi Bekliyor / ...) and, when ready, turns it into a full
 * customer card via the same CustomerSheet used on the Müşteriler page.
 *
 * Converting to a customer card does NOT remove the lead from this list —
 * only the card's own delete icon does. That's deliberate: closing the
 * CustomerSheet without saving (or just changing your mind) shouldn't lose
 * the original form submission. Successfully saving a card just marks the
 * lead "Müşteri Oldu" so it's obvious at a glance which ones are done.
 */
export default function Basvurular() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefill, setPrefill] = useState({});
  const [convertingLeadId, setConvertingLeadId] = useState(null);
  // { leadId, customer } once "Randevu Oluştur" is clicked on a lead card —
  // a lightweight customer record is created right away (appointments need
  // a real customerId) so the appointment can exist and show up on
  // Randevular immediately, without making the agent fill out the full
  // CustomerSheet first.
  const [appointmentTarget, setAppointmentTarget] = useState(null);

  function handleConvertLead(lead) {
    setConvertingLeadId(lead.id);
    setPrefill({ name: lead.name, phone: lead.phone, notes: lead.message, source: resolveLeadSource(lead.context) });
    setSheetOpen(true);
  }

  async function handleCustomerSaved() {
    if (convertingLeadId) {
      try {
        await updateLeadStatus(convertingLeadId, "Müşteri Oldu");
      } catch (error) {
        toast.error(error.message || "Başvuru durumu güncellenemedi.");
      }
      setConvertingLeadId(null);
    }
  }

  async function handleCreateAppointment(lead) {
    try {
      const customer = await addCustomer({
        name: lead.name,
        phone: lead.phone,
        notes: lead.message,
        source: resolveLeadSource(lead.context),
      });
      setAppointmentTarget({ leadId: lead.id, customer, serviceType: resolveServiceType(lead.context) });
    } catch (error) {
      toast.error(error.message || "Müşteri kartı oluşturulamadı.");
    }
  }

  async function handleAppointmentSaved() {
    if (appointmentTarget) {
      try {
        await updateLeadStatus(appointmentTarget.leadId, "Randevu Verildi");
      } catch (error) {
        toast.error(error.message || "Başvuru durumu güncellenemedi.");
      }
    }
  }

  return (
    <div className="space-y-6">
      <IncomingLeads onConvert={handleConvertLead} onCreateAppointment={handleCreateAppointment} />

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customer={null}
        prefill={prefill}
        onSaved={handleCustomerSaved}
      />

      {appointmentTarget && (
        <AppointmentFormDialog
          key={appointmentTarget.customer.id}
          open
          onOpenChange={(o) => !o && setAppointmentTarget(null)}
          appointment={null}
          initialCustomerId={appointmentTarget.customer.id}
          initialServiceType={appointmentTarget.serviceType}
          onSaved={handleAppointmentSaved}
        />
      )}
    </div>
  );
}
