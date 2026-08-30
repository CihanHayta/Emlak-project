import { useState } from "react";
import { toast } from "sonner";
import { X, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateAppointment, deleteAppointment } from "../data/appointmentStore";
import { APPOINTMENT_STATUS_STYLES } from "../data/constants";
import ListingThumbnail from "./ListingThumbnail";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

/**
 * Right-hand "Randevu Detayı" panel — mirrors the reference dashboard
 * mockup: listing thumbnail, key facts, and quick actions (Düzenle/İptal
 * Et/Tamamlandı Yap/Sil) without needing to open the full edit dialog for
 * common status changes.
 */
export default function AppointmentDetailPanel({ appointment, customer, onClose, onEdit, onChanged }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!appointment) return null;

  const { listing } = appointment;
  const isForSale = listing?.category === "satilik";

  async function setStatus(status) {
    try {
      await updateAppointment(appointment.id, { status });
      toast.success(`Randevu "${status}" olarak işaretlendi.`);
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Randevu güncellenemedi.");
    }
  }

  async function handleDelete() {
    try {
      await deleteAppointment(appointment.id);
      toast.success("Randevu silindi.");
      onChanged?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || "Randevu silinemedi.");
    }
  }

  return (
    <div className="w-80 shrink-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Randevu Detayı</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {listing && (
        <>
          <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-muted">
            <ListingThumbnail src={listing.image} alt={listing.title} className="h-full w-full object-cover" />
            {listing.hasVideo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                  <Play className="ml-0.5 h-4 w-4 fill-brand-navy text-brand-navy" />
                </span>
              </span>
            )}
            <span
              className={cn(
                "absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white",
                isForSale ? "bg-brand-gold" : "bg-emerald-600",
              )}
            >
              {isForSale ? "SATILIK" : "KİRALIK"}
            </span>
          </div>

          <p className="mb-0.5 text-xs text-muted-foreground">İlan No: {listing.listingNo}</p>
          <h4 className="mb-1 font-bold">{listing.title}</h4>
          <p className="mb-3 text-xs text-muted-foreground">{listing.neighborhood}, {listing.district}</p>
        </>
      )}

      <dl className="space-y-2.5 border-t border-border pt-3 text-sm">
        <Row label="Randevu Konusu" value={appointment.serviceType || "—"} />
        <Row label="Müşteri" value={customer?.name ?? "—"} />
        <Row label="Telefon" value={customer?.phone ?? "—"} />
        <Row
          label="Randevu Tarihi"
          value={new Date(appointment.dateTime).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
        />
        <Row
          label="Randevu Saati"
          value={new Date(appointment.dateTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        />
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Durum</dt>
          <dd className={cn("rounded-full px-2 py-0.5 text-xs font-medium", APPOINTMENT_STATUS_STYLES[appointment.status])}>
            {appointment.status}
          </dd>
        </div>
        <Row label="Not" value={appointment.note || "—"} />
      </dl>

      <div className="mt-4 space-y-2">
        <Button className="w-full bg-brand-navy text-white hover:bg-brand-navy-light" onClick={() => onEdit(appointment)}>
          Düzenle
        </Button>
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => setStatus("İptal Edildi")}
        >
          İptal Et
        </Button>
        <Button
          variant="outline"
          className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          onClick={() => setStatus("Tamamlandı")}
        >
          Tamamlandı Yap
        </Button>
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-100"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Randevuyu Sil
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Randevuyu sil"
        description={`${customer?.name ?? "Bu"} randevusunu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
