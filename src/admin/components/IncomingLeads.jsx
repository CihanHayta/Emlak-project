import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox, UserPlus, Trash2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLeads, removeLead, updateLeadStatus, subscribeToLeads } from "../../lib/leadStore";
import { toMillis } from "../../lib/firestoreTimestamp";
import { LEAD_STATUSES, LEAD_STATUS_STYLES } from "../data/constants";
import { cn } from "@/lib/utils";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

/**
 * "/admin/basvurular" content — public-site form submissions (service
 * request popup, İletişim page, listing inquiry form) waiting to be
 * triaged and turned into a customer card. This is the "forms land on
 * their own page" integration the agency owner asked for: submit a form
 * on the public site, see it here immediately (shared localStorage, see
 * lib/leadStore.js).
 *
 * A lead only ever disappears from here via the explicit trash icon below
 * (with a confirm step) — converting it to a customer card does NOT remove
 * it, so an accidental click or a cancelled CustomerSheet never loses the
 * original submission.
 */
export default function IncomingLeads({ onConvert, onCreateAppointment }) {
  const [leads, setLeads] = useState(getLeads());
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => subscribeToLeads(() => setLeads(getLeads())), []);

  async function confirmDelete() {
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await removeLead(id);
      toast("Başvuru silindi.");
    } catch (error) {
      toast.error(error.message || "Başvuru silinemedi.");
    }
  }

  async function handleStatusChange(leadId, status) {
    try {
      await updateLeadStatus(leadId, status);
    } catch (error) {
      toast.error(error.message || "Durum güncellenemedi.");
    }
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Henüz başvuru gelmedi.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {leads.map((lead) => (
        <div key={lead.id} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold">{lead.name}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onCreateAppointment(lead)}
                aria-label="Randevu oluştur"
                title="Randevu oluştur"
                className="text-muted-foreground hover:text-brand-gold-dark"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(lead)}
                aria-label="Başvuruyu sil"
                title="Başvuruyu sil"
                className="text-muted-foreground hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="truncate text-xs text-muted-foreground">{lead.phone}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{lead.context}</p>
          {lead.message && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{lead.message}”</p>}
          <span className="mt-2 text-[11px] text-muted-foreground">
            {new Date(toMillis(lead.createdAt)).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>

          <div className="mt-3 space-y-1.5">
            <Select value={lead.status ?? "Yeni"} onValueChange={(status) => handleStatusChange(lead.id, status)}>
              <SelectTrigger
                className={cn(
                  "h-8 w-full border-none px-2 text-xs font-medium",
                  LEAD_STATUS_STYLES[lead.status ?? "Yeni"],
                )}
              >
                <SelectValue>{lead.status ?? "Yeni"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            className="mt-3 w-full bg-brand-gold text-white hover:bg-brand-gold-dark"
            onClick={() => onConvert(lead)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Müşteri Kartı Oluştur
          </Button>
        </div>
      ))}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Başvuruyu sil"
        description={pendingDelete ? `"${pendingDelete.name}" adlı başvuruyu kalıcı olarak silmek istediğinize emin misiniz?` : ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
