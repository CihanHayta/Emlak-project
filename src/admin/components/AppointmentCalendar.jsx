import { useState } from "react";
import {
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  isSameDay,
  isSameMonth,
  format,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_STYLES } from "../data/constants";

/**
 * "Takvim" (calendar) view for Randevular — three modes (günlük/haftalık/
 * aylık) over the same appointment list, Google-Calendar-style. Kept as
 * agenda-style day/week columns rather than a precise hour-by-hour grid:
 * simpler to get right, and still shows exactly what's scheduled when.
 */
export default function AppointmentCalendar({ mode, appointments, customersById, onSelect, onCreate }) {
  const [anchorDate, setAnchorDate] = useState(new Date());

  function goPrev() {
    if (mode === "gunluk") setAnchorDate((d) => addDays(d, -1));
    else if (mode === "haftalik") setAnchorDate((d) => addWeeks(d, -1));
    else setAnchorDate((d) => addMonths(d, -1));
  }
  function goNext() {
    if (mode === "gunluk") setAnchorDate((d) => addDays(d, 1));
    else if (mode === "haftalik") setAnchorDate((d) => addWeeks(d, 1));
    else setAnchorDate((d) => addMonths(d, 1));
  }
  function goToday() {
    setAnchorDate(new Date());
  }

  const appointmentsOn = (day) => appointments.filter((a) => isSameDay(a.dateTime, day));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{formatHeading(mode, anchorDate)}</h3>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={goToday}>Bugün</Button>
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Önceki"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Sonraki"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {mode === "gunluk" && (
        <DayAgenda
          appointments={appointmentsOn(anchorDate)}
          customersById={customersById}
          onSelect={onSelect}
          day={anchorDate}
          onCreate={onCreate}
        />
      )}

      {mode === "haftalik" && (
        <WeekGrid
          anchorDate={anchorDate}
          appointments={appointments}
          customersById={customersById}
          onSelect={onSelect}
          onCreate={onCreate}
        />
      )}

      {mode === "aylik" && (
        <MonthView
          anchorDate={anchorDate}
          setAnchorDate={setAnchorDate}
          appointments={appointments}
          customersById={customersById}
          onSelect={onSelect}
          onCreate={onCreate}
        />
      )}
    </div>
  );
}

function formatHeading(mode, date) {
  if (mode === "gunluk") return format(date, "d MMMM yyyy, EEEE", { locale: tr });
  if (mode === "haftalik") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return `${format(start, "d MMM", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
  }
  return format(date, "MMMM yyyy", { locale: tr });
}

function AppointmentChip({ appointment, customersById, onSelect }) {
  const customer = customersById[appointment.customerId];
  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-border bg-card p-2 text-left text-xs shadow-sm transition hover:shadow-md"
    >
      <span className="font-semibold">{format(appointment.dateTime, "HH:mm")} · {customer?.name ?? "Müşteri"}</span>
      <span className="truncate text-muted-foreground">{appointment.listing?.title ?? "İlan"}</span>
      <span className={cn("mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", APPOINTMENT_STATUS_STYLES[appointment.status])}>
        {appointment.status}
      </span>
    </button>
  );
}

function DayAgenda({ appointments, customersById, onSelect, day, onCreate }) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">Bu tarihte randevu yok.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onCreate?.(day)}>
          <Plus className="h-3.5 w-3.5" />
          Randevu Ekle
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {appointments
        .sort((a, b) => a.dateTime - b.dateTime)
        .map((a) => (
          <AppointmentChip key={a.id} appointment={a} customersById={customersById} onSelect={onSelect} />
        ))}
      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => onCreate?.(day)}>
        <Plus className="h-3.5 w-3.5" />
        Randevu Ekle
      </Button>
    </div>
  );
}

function WeekGrid({ anchorDate, appointments, customersById, onSelect, onCreate }) {
  const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const dayAppointments = appointments.filter((a) => isSameDay(a.dateTime, day));
        const isToday = isSameDay(day, new Date());
        return (
          <div key={day.toISOString()} className="min-h-35 rounded-xl border border-border p-2">
            <div className="mb-2 flex items-center justify-between">
              <p className={cn("text-xs font-semibold", isToday && "text-brand-gold-dark")}>
                {format(day, "EEE d", { locale: tr })}
              </p>
              <button
                type="button"
                onClick={() => onCreate?.(day)}
                aria-label="Randevu ekle"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              {dayAppointments.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">—</p>
              ) : (
                dayAppointments
                  .sort((a, b) => a.dateTime - b.dateTime)
                  .map((a) => <AppointmentChip key={a.id} appointment={a} customersById={customersById} onSelect={onSelect} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ anchorDate, setAnchorDate, appointments, customersById, onSelect, onCreate }) {
  const [selectedDay, setSelectedDay] = useState(anchorDate);
  const daysWithAppointments = appointments.map((a) => new Date(a.dateTime));

  const dayAppointments = appointments
    .filter((a) => isSameDay(a.dateTime, selectedDay))
    .sort((a, b) => a.dateTime - b.dateTime);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Calendar
        mode="single"
        month={anchorDate}
        onMonthChange={setAnchorDate}
        selected={selectedDay}
        onSelect={(day) => day && setSelectedDay(day)}
        locale={tr}
        modifiers={{ hasAppointment: daysWithAppointments }}
        modifiersClassNames={{ hasAppointment: "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-brand-gold" }}
        className="rounded-xl border border-border"
      />
      <div className="flex-1">
        <h4 className="mb-3 font-semibold">
          {format(selectedDay, "d MMMM yyyy", { locale: tr })}
          {!isSameMonth(selectedDay, anchorDate) && " (farklı ay)"}
        </h4>
        <DayAgenda appointments={dayAppointments} customersById={customersById} onSelect={onSelect} day={selectedDay} onCreate={onCreate} />
      </div>
    </div>
  );
}
