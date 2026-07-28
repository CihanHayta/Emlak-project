import { useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, Edit, Trash2, Send, TrendingDown } from "lucide-react";
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
import { getStaleListingInfo } from "../lib/staleListing";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

/**
 * One customer card in the CRM grid. Right-click (or long-press on touch)
 * opens a quick-actions context menu — change status, call, WhatsApp, edit,
 * delete — without needing to open the full edit sheet for common actions.
 */
export default function CustomerCard({ customer, onEdit, onChanged }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const staleListing = getStaleListingInfo(customer);
  const budgetLabel =
    customer.budgetMin || customer.budgetMax
      ? `${customer.budgetMin?.toLocaleString("tr-TR") ?? "?"} - ${customer.budgetMax?.toLocaleString("tr-TR") ?? "?"} TL`
      : null;

  function handleStatusChange(status) {
    updateCustomer(customer.id, { status });
    addTimelineEntry(customer.id, `Durum güncellendi: ${status}`);
    toast.success(`${customer.name} için durum "${status}" olarak güncellendi.`);
    onChanged?.();
  }

  function handleDelete() {
    deleteCustomer(customer.id);
    toast.success("Müşteri kartı silindi.");
    onChanged?.();
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition hover:shadow-md">
          {/* Header: avatar + name/phone */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">
              {customer.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onEdit(customer)}
                className="truncate text-left text-sm font-semibold text-foreground hover:underline"
              >
                {customer.name}
              </button>
              <p className="truncate text-xs text-muted-foreground">{customer.phone}</p>
            </div>
          </div>

          {/* Status + Alıcı/Satıcı — each on a fitted chip, wrapping onto
              their own row so a long label (e.g. "Randevu Oluşturuldu")
              never overflows the card next to the name. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "w-fit max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-medium",
                CUSTOMER_STATUS_STYLES[customer.status],
              )}
            >
              {customer.status}
            </span>
            <span
              className={cn(
                "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
                customer.role === "Satıcı"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {customer.role ?? "Alıcı"}
            </span>
          </div>

          {/* Stale-listing nudge: this customer's own for-sale/for-rent
              listing has been sitting for N+ months — suggest a price change. */}
          {staleListing && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                “{staleListing.listing.title}” ilanı {staleListing.monthsElapsed} aydır satılmadı/kiralanmadı.
                Fiyatta değişiklik yapmak ister mi?
              </p>
            </div>
          )}

          {/* Contact icons */}
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${customer.phone.replace(/\s/g, "")}`}
              title="Ara"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-blue-100 hover:text-blue-600"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
            <a
              href={buildWhatsAppLink(`Merhaba ${customer.name}, Şahin Emlak'tan yazıyorum.`)}
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-emerald-100 hover:text-emerald-600"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
            </a>
            {customer.instagram && (
              <a
                href={`https://instagram.com/${customer.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-pink-100 hover:text-pink-600"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                title="Mail"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-violet-100 hover:text-violet-600"
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {customer.source}
            </span>
          </div>

          {/* Interests */}
          {customer.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customer.interests.map((interest) => (
                <span key={interest} className="rounded-full bg-brand-gold/10 px-2 py-0.5 text-[11px] font-medium text-brand-gold-dark">
                  {interest}
                </span>
              ))}
            </div>
          )}

          {budgetLabel && <p className="text-sm font-semibold text-foreground">{budgetLabel}</p>}

          {(customer.desiredProvince || customer.desiredDistrict) && (
            <p className="text-xs text-muted-foreground">
              📍 {[customer.desiredDistrict, customer.desiredProvince].filter(Boolean).join(", ")}
            </p>
          )}

          {customer.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{customer.notes}</p>}

          {customer.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
              {customer.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => onEdit(customer)}>
          <Edit className="h-4 w-4" />
          Kartı Düzenle
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
