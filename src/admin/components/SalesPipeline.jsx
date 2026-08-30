import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { updateCustomer, addTimelineEntry } from "../data/customerStore";
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_STYLES } from "../data/constants";
import { playPipelineMoveSound } from "../lib/playSound";
import { cn } from "@/lib/utils";

/**
 * "Satış Hattı" — a Trello-style pipeline board for the Dashboard: every
 * customer grouped into a column by their current `status`
 * (Yeni -> Arandı -> Teklif Verildi -> Randevu Oluşturuldu -> Satış Oldu /
 * Kaybedildi). Drag a card into another column to move that customer
 * through the funnel — same underlying data as the Müşteriler page, just a
 * faster at-a-glance view of where everyone stands.
 *
 * The "Yeni" column also shows not-yet-converted Başvurular leads (status
 * "Yeni") — the moment a form comes in it should be visible here, not just
 * after someone gets around to turning it into a customer card. They're
 * shown with a "Form" tag and aren't draggable (there's no customer record
 * yet); clicking one jumps to Başvurular to triage/convert it.
 */
export default function SalesPipeline({ customers, leads = [], onChanged }) {
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const navigate = useNavigate();
  const newLeads = leads.filter((l) => (l.status ?? "Yeni") === "Yeni");

  function handleDrop(status) {
    return async (event) => {
      event.preventDefault();
      setDragOverStatus(null);
      const customerId = event.dataTransfer.getData("text/plain");
      const customer = customers.find((c) => c.id === customerId);
      if (!customer || customer.status === status) return;
      try {
        await updateCustomer(customerId, { status });
        await addTimelineEntry(customerId, `Durum güncellendi: ${status}`);
        toast.success(`"${customer.name}" → ${status}`);
        playPipelineMoveSound();
        onChanged?.();
      } catch (error) {
        toast.error(error.message || "Durum güncellenemedi.");
      }
    };
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {CUSTOMER_STATUSES.map((status) => {
        const columnCustomers = customers.filter((c) => c.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
            onDrop={handleDrop(status)}
            className={cn(
              "flex w-64 shrink-0 flex-col rounded-2xl border border-border bg-muted/20 p-3 transition-colors",
              dragOverStatus === status && "border-brand-gold bg-brand-gold/5",
            )}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CUSTOMER_STATUS_STYLES[status])}>
                {status}
              </span>
              <span className="text-xs text-muted-foreground">
                {columnCustomers.length + (status === "Yeni" ? newLeads.length : 0)}
              </span>
            </div>

            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {columnCustomers.length === 0 && newLeads.length === 0 && (
                <p className="px-1 text-center text-xs text-muted-foreground">Boş</p>
              )}
              {status === "Yeni" &&
                newLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => navigate("/admin/basvurular")}
                    className="rounded-xl border border-dashed border-brand-gold/50 bg-brand-gold/5 p-2.5 text-left text-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3 shrink-0 text-brand-gold-dark" />
                      <p className="truncate font-medium">{lead.name}</p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{lead.phone}</p>
                    <span className="mt-1 inline-block rounded-full bg-brand-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-gold-dark">
                      Form
                    </span>
                  </button>
                ))}
              {columnCustomers.map((customer) => (
                <div
                  key={customer.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", customer.id)}
                  className="cursor-grab rounded-xl border border-border bg-card p-2.5 text-sm shadow-sm active:cursor-grabbing"
                >
                  <p className="truncate font-medium">{customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{customer.phone}</p>
                  {Boolean(customer.budgetMin || customer.budgetMax) && (
                    <p className="mt-1 truncate text-xs font-medium text-brand-gold-dark">
                      {customer.budgetMin?.toLocaleString("tr-TR")} - {customer.budgetMax?.toLocaleString("tr-TR")} TL
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
