import { useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, Edit, Trash2, Send, TrendingDown, MapPin, CalendarPlus } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { WhatsAppIcon, InstagramIcon } from "../../components/common/BrandIcons";
import { buildWhatsAppLink } from "../../config/siteConfig";
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_STYLES } from "../data/constants";
import { updateCustomer, deleteCustomer, addTimelineEntry } from "../data/customerStore";
import { toMillis } from "../../lib/firestoreTimestamp";
import { getStaleListingInfo } from "../lib/staleListing";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

// A customer's avatar is colored by hashing their id against this palette —
// purely cosmetic, but it's what makes a dense grid of cards scannable at a
// glance instead of a wall of identical navy circles.
const AVATAR_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-emerald-600", "bg-amber-600",
  "bg-rose-600", "bg-cyan-600", "bg-fuchsia-600", "bg-orange-600",
];
function avatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const PLACEHOLDER = "—";

/**
 * One customer card in the CRM grid. Every card renders the exact same set
 * of rows (Kaynağı / Bütçe / Konum / Son Aktivite) whether or not that data
 * was actually filled in — missing values fall back to "—" / "Belirtilmemiş"
 * instead of the row disappearing. That's deliberate: a grid where some
 * cards have 4 rows and others have 9 (manual entries vs. bare-minimum
 * leads converted from Başvurular) reads as broken. A fixed shell keeps
 * every card the same size no matter which form it came from.
 *
 * Right-click (or long-press on touch) opens a quick-actions context menu —
 * change status, call, WhatsApp, edit, delete. The calendar icon in the
 * footer creates an appointment for this customer directly (same dialog
 * Randevular uses), without needing to open the edit sheet first.
 */
export default function CustomerCard({ customer, onEdit, onChanged, onCreateAppointment }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const staleListing = getStaleListingInfo(customer);
  const budgetLabel =
    customer.budgetMin || customer.budgetMax
      ? `${customer.budgetMin?.toLocaleString("tr-TR") ?? "?"} - ${customer.budgetMax?.toLocaleString("tr-TR") ?? "?"} TL`
      : "Belirtilmemiş";
  const locationLabel = [customer.desiredDistrict, customer.desiredProvince].filter(Boolean).join(", ") || PLACEHOLDER;
  const lastActivityAt = toMillis(
    customer.timeline?.length ? customer.timeline[customer.timeline.length - 1].at : customer.createdAt,
  );

  async function handleStatusChange(status) {
    try {
      await updateCustomer(customer.id, { status });
      await addTimelineEntry(customer.id, `Durum güncellendi: ${status}`);
      toast.success(`${customer.name} için durum "${status}" olarak güncellendi.`);
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Durum güncellenemedi.");
    }
  }

  async function handleDelete() {
    try {
      await deleteCustomer(customer.id);
      toast.success("Müşteri kartı silindi.");
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Müşteri kartı silinemedi.");
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group flex h-full flex-col gap-1.5 rounded-xl border border-border bg-card p-2.5 shadow-sm transition hover:shadow-md">
          {/* Header: avatar + name/phone — kept free of badges so a long
              status label (e.g. "Randevu Oluşturuldu") never squeezes the
              name/phone column. */}
          <div className="flex items-start gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                avatarColor(customer.id),
              )}
            >
              {customer.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onEdit(customer)}
                className="truncate text-left text-sm font-semibold text-foreground hover:underline"
              >
                {customer.name}
              </button>
              <p className="truncate text-[11px] text-muted-foreground">{customer.phone}</p>
            </div>
          </div>

          {/* Status + Alıcı/Satıcı — each on a fitted chip, wrapping onto
              their own row so a long label never overflows the card. */}
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={cn(
                "w-fit max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                CUSTOMER_STATUS_STYLES[customer.status],
              )}
            >
              {customer.status}
            </span>
            <span
              className={cn(
                "w-fit rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                customer.role === "Satıcı" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600",
              )}
            >
              {customer.role ?? "Alıcı"}
            </span>
          </div>

          {/* Fixed info rows — always present, "—"/"Belirtilmemiş" when empty,
              so every card in the grid takes up the same amount of space. */}
          <dl className="space-y-0.5 text-[11px]">
            <div className="flex gap-1">
              <dt className="shrink-0 text-muted-foreground">Kaynak:</dt>
              <dd className="truncate font-medium text-foreground">{customer.source || PLACEHOLDER}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="shrink-0 text-muted-foreground">Bütçe:</dt>
              <dd className="truncate font-medium text-foreground">{budgetLabel}</dd>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              <dd className="truncate font-medium text-foreground">{locationLabel}</dd>
            </div>
          </dl>

          {/* Stale-listing nudge: this customer's own for-sale/for-rent
              listing has been sitting for N+ months — suggest a price change.
              Appended after the fixed rows so it only grows the rare card it
              applies to, instead of reserving space on every card. */}
          {staleListing && (
            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-1.5 text-[11px] text-amber-800">
              <TrendingDown className="mt-0.5 h-3 w-3 shrink-0" />
              <p className="line-clamp-2">
                “{staleListing.listing.title}” {staleListing.monthsElapsed} aydır satılmadı. Fiyat değişikliği?
              </p>
            </div>
          )}

          {/* Footer: last activity + quick actions, pinned to the bottom via
              mt-auto so it lines up across cards regardless of the content above. */}
          <div className="mt-auto flex items-center justify-between gap-1 border-t border-border pt-1.5">
            <span className="truncate text-[10px] text-muted-foreground">
              Son aktivite: {new Date(lastActivityAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={`tel:${customer.phone.replace(/\s/g, "")}`}
                title="Ara"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-blue-100 hover:text-blue-600"
              >
                <Phone className="h-3 w-3" />
              </a>
              <a
                href={buildWhatsAppLink(`Merhaba ${customer.name}, Şahin Emlak'tan yazıyorum.`)}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-emerald-100 hover:text-emerald-600"
              >
                <WhatsAppIcon className="h-3 w-3" />
              </a>
              {customer.instagram && (
                <a
                  href={`https://instagram.com/${customer.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-pink-100 hover:text-pink-600"
                >
                  <InstagramIcon className="h-3 w-3" />
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  title="Mail"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-violet-100 hover:text-violet-600"
                >
                  <Mail className="h-3 w-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => onCreateAppointment(customer)}
                title="Randevu oluştur"
                aria-label="Randevu oluştur"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-brand-gold/15 hover:text-brand-gold-dark"
              >
                <CalendarPlus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => onEdit(customer)}>
          <Edit className="h-4 w-4" />
          Kartı Düzenle
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onCreateAppointment(customer)}>
          <CalendarPlus className="h-4 w-4" />
          Randevu Oluştur
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Durumu Güncelle</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {CUSTOMER_STATUSES.map((status) => (
              <ContextMenuItem key={status} onSelect={() => handleStatusChange(status)}>
                {status}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem asChild>
          <a href={`tel:${customer.phone.replace(/\s/g, "")}`}>
            <Phone className="h-4 w-4" />
            Ara
          </a>
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a
            href={buildWhatsAppLink(`Merhaba ${customer.name}, Şahin Emlak'tan yazıyorum.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Send className="h-4 w-4" />
            WhatsApp’tan Yaz
          </a>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Sil
        </ContextMenuItem>
      </ContextMenuContent>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Müşteri kartını sil"
        description={`"${customer.name}" kartını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        onConfirm={handleDelete}
      />
    </ContextMenu>
  );
}
