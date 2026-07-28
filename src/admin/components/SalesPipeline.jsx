import { useState } from "react";
import { toast } from "sonner";
import { updateCustomer, addTimelineEntry } from "../data/customerStore";
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_STYLES } from "../data/constants";
import { cn } from "@/lib/utils";

/**
 * "Satış Hattı" — a Trello-style pipeline board for the Dashboard: every
 * customer grouped into a column by their current `status`
 * (Yeni -> Arandı -> Teklif Verildi -> Randevu Oluşturuldu -> Satış Oldu /
 * Kaybedildi). Drag a card into another column to move that customer
 * through the funnel — same underlying data as the Müşteriler page, just a
 * faster at-a-glance view of where everyone stands.
 */
export default function SalesPipeline({ customers, onChanged }) {
  const [dragOverStatus, setDragOverStatus] = useState(null);

  function handleDrop(status) {
    return (event) => {
      event.preventDefault();
      setDragOverStatus(null);
      const customerId = event.dataTransfer.getData("text/plain");
      const customer = customers.find((c) => c.id === customerId);
      if (!customer || customer.status === status) return;
      updateCustomer(customerId, { status });
      addTimelineEntry(customerId, `Durum güncellendi: ${status}`);
      toast.success(`"${customer.name}" → ${status}`);
      onChanged?.();
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
              <span className="text-xs text-muted-foreground">{columnCustomers.length}</span>
            </div>

            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {columnCustomers.length === 0 && (
                <p className="px-1 text-center text-xs text-muted-foreground">Boş</p>
              )}
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
