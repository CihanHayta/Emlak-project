import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLeads, removeLead, updateLeadStatus, subscribeToLeads } from "../../lib/leadStore";
import { LEAD_STATUSES, LEAD_STATUS_STYLES } from "../data/constants";
import { cn } from "@/lib/utils";

/**
 * "/admin/basvurular" content — public-site form submissions (service
 * request popup, İletişim page, listing inquiry form) waiting to be
 * triaged and turned into a customer card. This is the "forms land on
 * their own page" integration the agency owner asked for: submit a form
 * on the public site, see it here immediately (shared localStorage, see
 * lib/leadStore.js).
 */
export default function IncomingLeads({ onConvert }) {
  const [leads, setLeads] = useState(getLeads());

  useEffect(() => subscribeToLeads(() => setLeads(getLeads())), []);

  function dismiss(id) {
    removeLead(id);
    toast("Başvuru kaldırıldı.");
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
            <button
              type="button"
              onClick={() => dismiss(lead.id)}
              aria-label="Kaldır"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="truncate text-xs text-muted-foreground">{lead.phone}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{lead.context}</p>
          {lead.message && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{lead.message}”</p>}
          <span className="mt-2 text-[11px] text-muted-foreground">
            {new Date(lead.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>

          <div className="mt-3 space-y-1.5">
            <Select value={lead.status ?? "Yeni"} onValueChange={(status) => updateLeadStatus(lead.id, status)}>
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
    </div>
  );
}
