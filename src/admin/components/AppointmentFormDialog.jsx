import { useState } from "react";
import { toast } from "sonner";
import { tr } from "date-fns/locale";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCustomers } from "../data/customerStore";
import { addAppointment, updateAppointment, getAppointments } from "../data/appointmentStore";
import { getSaleProperties, getRentProperties } from "../../data/properties";
import { usePropertiesVersion } from "../../hooks/usePropertiesVersion";
import { APPOINTMENT_STATUSES, APPOINTMENT_SERVICE_TYPES } from "../data/constants";
import { getDaySlots, getSlotDateTime, isSlotTaken, isDayFullyBooked } from "../lib/appointmentSlots";
import { playAppointmentCreatedSound } from "../lib/playSound";

const NONE = "__none__"; // shadcn Select boş string value'yu kabul etmiyor — "seçim yok" için bu sentinel kullanılır (bkz. admin/pages/Mesajlar.jsx'teki aynı desen).

/** Bir zaman damgasını, o günün çalışma-saati slot ızgarasındaki (en yakın alttaki) slota yuvarlar — mevcut bir randevuyu düzenlerken başlangıç seçimini bulmak için. */
function closestSlot(timestamp) {
  const d = new Date(timestamp);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const slots = getDaySlots();
  const atOrBefore = slots.filter((s) => s.hour * 60 + s.minute <= minutes);
  return atOrBefore[atOrBefore.length - 1] ?? slots[0];
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
  usePropertiesVersion();
  const customers = getCustomers();
  const listings = [...getSaleProperties(), ...getRentProperties()];

  const [customerId, setCustomerId] = useState(appointment?.customerId ?? initialCustomerId ?? "");
  const [serviceType, setServiceType] = useState(appointment?.serviceType ?? initialServiceType ?? "İlan Gösterimi");
  const [listingId, setListingId] = useState(appointment?.listingId ?? "");
  const initialTimestamp = appointment?.dateTime ?? initialDateTime?.getTime() ?? Date.now() + 60 * 60 * 1000;
  const [selectedDay, setSelectedDay] = useState(new Date(initialTimestamp));
  const [selectedSlot, setSelectedSlot] = useState(closestSlot(initialTimestamp));
  const [status, setStatus] = useState(appointment?.status ?? "Beklemede");
  const [note, setNote] = useState(appointment?.note ?? "");

  const appointments = getAppointments();
  const daySlots = getDaySlots();

  function handleDaySelect(day) {
    if (!day) return;
    setSelectedDay(day);
    setSelectedSlot(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedSlot) {
      toast.error("Lütfen bir saat seçin.");
      return;
    }
    const payload = {
      customerId,
      serviceType,
      listingId,
      dateTime: getSlotDateTime(selectedDay, selectedSlot).getTime(),
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
        playAppointmentCreatedSound();
      }
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Randevu kaydedilemedi.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Randevuyu Düzenle" : "Yeni Randevu"}</DialogTitle>
          <DialogDescription>Müşteri ve randevu zamanını seçin — ilgili bir ilan varsa ekleyebilirsiniz.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Sol: müşteri/ilan/konu/durum/not */}
            <div className="space-y-4">
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
                <Select value={listingId || NONE} onValueChange={(v) => setListingId(v === NONE ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{listingId ? listings.find((l) => l.id === listingId)?.title : "Seçim yok"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NONE}>Seçim yok</SelectItem>
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
            </div>

            {/* Sağ: takvim + saat seçici */}
            <div className="space-y-1.5">
              <Label>Tarih & Saat</Label>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={handleDaySelect}
                  locale={tr}
                  disabled={[{ before: new Date(new Date().setHours(0, 0, 0, 0)) }, (day) => isDayFullyBooked(day, appointments, appointment?.id)]}
                  className="mx-auto rounded-lg border border-border p-0"
                />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {format(selectedDay, "d MMMM yyyy, EEEE", { locale: tr })} — müsait saatler
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {daySlots.map((slot) => {
                      const taken = isSlotTaken(selectedDay, slot, appointments, appointment?.id);
                      const isSelected = selectedSlot?.hour === slot.hour && selectedSlot?.minute === slot.minute;
                      return (
                        <button
                          key={`${slot.hour}:${slot.minute}`}
                          type="button"
                          disabled={taken}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-xs font-medium transition",
                            taken && "cursor-not-allowed border-border bg-muted text-muted-foreground line-through",
                            !taken && isSelected && "border-brand-gold bg-brand-gold text-white",
                            !taken && !isSelected && "border-border bg-card hover:border-brand-gold",
                          )}
                        >
                          {String(slot.hour).padStart(2, "0")}:{String(slot.minute).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!selectedSlot} className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60">
              {isEditing ? "Kaydet" : "Randevu Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
