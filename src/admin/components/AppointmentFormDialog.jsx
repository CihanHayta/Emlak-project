import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCustomers } from "../data/customerStore";
import { addAppointment, updateAppointment } from "../data/appointmentStore";
import { getSaleProperties, getRentProperties } from "../../data/properties";
import { APPOINTMENT_STATUSES, APPOINTMENT_SERVICE_TYPES } from "../data/constants";

function toDateTimeLocalValue(timestamp) {
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Create/edit dialog for a single appointment: pick a customer, a randevu
 * konusu (service type — a listing viewing or one of our services), date &
 * time, status and a free-text note. Same dialog for both "+ Yeni Randevu"
 * and editing an existing row from the table/detail panel.
 *
 * The listing itself is optional — plenty of appointments (kredi
 * danışmanlığı, ekspertiz, 7/24 destek, ...) aren't about a specific
 * property, so the agent shouldn't be forced to pick one just to save the
 * appointment.
 *
 * `initialCustomerId` pre-selects a customer without needing a full
 * `appointment` object — used right after converting a lead/creating a
 * customer card, to offer "schedule their first appointment now".
 * `initialServiceType` pre-selects the randevu konusu the same way — used
 * when the lead already said what they wanted (e.g. "Kredi Danışmanlığı").
 * `initialDateTime` (a Date) pre-fills the date/time — used when creating
 * an appointment straight from a calendar day cell.
 */
export default function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  initialCustomerId,
  initialServiceType,
  initialDateTime,
  onSaved,
}) {
  const isEditing = Boolean(appointment);
  const customers = getCustomers();
  const listings = [...getSaleProperties(), ...getRentProperties()];

  const [customerId, setCustomerId] = useState(appointment?.customerId ?? initialCustomerId ?? "");
  const [serviceType, setServiceType] = useState(appointment?.serviceType ?? initialServiceType ?? "İlan Gösterimi");
  const [listingId, setListingId] = useState(appointment?.listingId ?? "");
  const [dateTime, setDateTime] = useState(
    toDateTimeLocalValue(appointment?.dateTime ?? initialDateTime?.getTime() ?? Date.now() + 60 * 60 * 1000),
  );
  const [status, setStatus] = useState(appointment?.status ?? "Beklemede");
  const [note, setNote] = useState(appointment?.note ?? "");

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      customerId,
      serviceType,
      listingId,
      dateTime: new Date(dateTime).getTime(),
      status,
      note,
    };

    try {
      if (isEditing) {
        await updateAppointment(appointment.id, payload);
        toast.success("Randevu güncellendi.");
      } else {
        await addAppointment(payload);
        toast.success("Randevu oluşturuldu.");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Randevu kaydedilemedi.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Randevuyu Düzenle" : "Yeni Randevu"}</DialogTitle>
          <DialogDescription>Müşteri ve randevu zamanını seçin — ilgili bir ilan varsa ekleyebilirsiniz.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Müşteri</Label>
            <Select value={customerId} onValueChange={setCustomerId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Müşteri seçin">
                  {customers.find((c) => c.id === customerId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>İlan <span className="font-normal text-muted-foreground">(opsiyonel)</span></Label>
            <Select value={listingId} onValueChange={setListingId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="İlgili bir ilan varsa seçin">
                  {listings.find((l) => l.id === listingId)?.title}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {listings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.title} — #{l.listingNo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Randevu Konusu</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="w-full"><SelectValue>{serviceType}</SelectValue></SelectTrigger>
              <SelectContent>
                {APPOINTMENT_SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-datetime">Tarih & Saat</Label>
            <Input
              id="a-datetime"
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue>{status}</SelectValue></SelectTrigger>
              <SelectContent>
                {APPOINTMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-note">Not</Label>
            <Textarea id="a-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark">
              {isEditing ? "Kaydet" : "Randevu Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
