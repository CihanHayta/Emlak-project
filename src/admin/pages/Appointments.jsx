import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarCheck, Clock, CheckCircle2, Plus, MoreVertical, Trash2 } from "lucide-react";
import { WhatsAppIcon } from "../../components/common/BrandIcons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatCard from "../components/StatCard";
import AppointmentDetailPanel from "../components/AppointmentDetailPanel";
import AppointmentFormDialog from "../components/AppointmentFormDialog";
import AppointmentCalendar from "../components/AppointmentCalendar";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import { getAppointments, subscribeToAppointments, updateAppointment, deleteAppointment } from "../data/appointmentStore";
import { getCustomers, subscribeToCustomers } from "../data/customerStore";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_STYLES } from "../data/constants";
import { buildWhatsAppLink } from "../../config/siteConfig";
import { cn } from "@/lib/utils";

const ALL = "__all__";

/**
 * "/admin/randevular" — appointments: stat cards + a "Liste" (table, like
 * the reference dashboard mockup) / "Takvim" (calendar: günlük/haftalık/
 * aylık) toggle over the same data.
 */
export default function Appointments() {
  const [appointments, setAppointments] = useState(getAppointments());
  const [customers, setCustomers] = useState(getCustomers());
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [calendarMode, setCalendarMode] = useState("aylik");
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [createDefaultDate, setCreateDefaultDate] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    const unsubA = subscribeToAppointments(() => setAppointments(getAppointments()));
    const unsubC = subscribeToCustomers(() => setCustomers(getCustomers()));
    return () => {
      unsubA();
      unsubC();
    };
  }, []);

  const customersById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const stats = {
    total: appointments.length,
    thisMonth: appointments.filter((a) => a.dateTime >= startOfMonth.getTime()).length,
    today: appointments.filter((a) => a.dateTime >= startOfToday.getTime() && a.dateTime <= endOfToday.getTime()).length,
    completed: appointments.filter((a) => a.status === "Tamamlandı").length,
  };

  // Liste view: upcoming appointments first (soonest first), geçmiş
  // (past-due) appointments pushed to the bottom instead of interleaving
  // chronologically — within each group still sorted by date, just radiating
  // outward from "now" in both directions instead of one flat ascending list.
  const now = Date.now();
  const upcomingFirst = [
    ...appointments.filter((a) => a.dateTime >= now).sort((a, b) => a.dateTime - b.dateTime),
    ...appointments.filter((a) => a.dateTime < now).sort((a, b) => b.dateTime - a.dateTime),
  ];
  const filteredAppointments = statusFilter === ALL ? upcomingFirst : upcomingFirst.filter((a) => a.status === statusFilter);
  const selectedAppointment = appointments.find((a) => a.id === selectedId) ?? null;

  function openCreate() {
    setEditingAppointment(null);
    setCreateDefaultDate(null);
    setDialogOpen(true);
  }
  function openCreateForDate(date) {
    setEditingAppointment(null);
    setCreateDefaultDate(date);
    setDialogOpen(true);
  }
  function openEdit(appointment) {
    setEditingAppointment(appointment);
    setCreateDefaultDate(null);
    setDialogOpen(true);
  }
  async function quickStatus(appointment, status) {
    try {
      await updateAppointment(appointment.id, { status });
      toast.success(`Randevu "${status}" olarak işaretlendi.`);
    } catch (error) {
      toast.error(error.message || "Randevu güncellenemedi.");
    }
  }

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteAppointment(target.id);
      toast.success("Randevu silindi.");
      if (selectedId === target.id) setSelectedId(null);
    } catch (error) {
      toast.error(error.message || "Randevu silinemedi.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} tone="violet" value={stats.total} label="Toplam Randevu" sublabel="Tüm zamanlar" />
        <StatCard icon={CalendarCheck} tone="green" value={stats.thisMonth} label="Bu Ayki Randevu" sublabel="Bu ay" />
        <StatCard icon={Clock} tone="amber" value={stats.today} label="Bugünkü Randevu" sublabel="Bugün" />
        <StatCard icon={CheckCircle2} tone="blue" value={stats.completed} label="Tamamlanan" sublabel="Tüm zamanlar" />
      </div>

      <Tabs defaultValue="liste">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="liste">Liste</TabsTrigger>
            <TabsTrigger value="takvim">Takvim</TabsTrigger>
          </TabsList>
          <Button onClick={openCreate} className="bg-brand-gold text-white hover:bg-brand-gold-dark">
            <Plus className="h-4 w-4" />
            Yeni Randevu
          </Button>
        </div>

        {/* Liste view */}
        <TabsContent value="liste" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <FilterPill active={statusFilter === ALL} onClick={() => setStatusFilter(ALL)}>Tümü</FilterPill>
            {APPOINTMENT_STATUSES.map((s) => (
              <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</FilterPill>
            ))}
          </div>

          <div className="flex gap-6">
            <div className="flex-1 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Müşteri</th>
                    <th className="px-4 py-3">Konu / İlan</th>
                    <th className="px-4 py-3">Tarih & Saat</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Not</th>
                    <th className="px-4 py-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Bu kritere uygun randevu bulunamadı.
                      </td>
                    </tr>
                  )}
                  {filteredAppointments.map((a) => {
                    const customer = customersById[a.customerId];
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedId(a.id)}
                        className={cn(
                          "cursor-pointer border-b border-border last:border-0 hover:bg-muted/30",
                          selectedId === a.id && "bg-muted/50",
                        )}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{customer?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{customer?.phone}</p>
                        </td>
                        <td className="max-w-48 px-4 py-3">
                          <p className="truncate font-medium">{a.listing?.title ?? a.serviceType ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.listing ? `İlan No: ${a.listing.listingNo}` : a.serviceType ? "Hizmet randevusu" : "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p>{new Date(a.dateTime).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.dateTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", APPOINTMENT_STATUS_STYLES[a.status])}>
                            {a.status}
                          </span>
                        </td>
                        <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">{a.note || "—"}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {customer && (
                              <a
                                href={buildWhatsAppLink(`Merhaba ${customer.name}, randevunuzla ilgili yazıyorum.`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="WhatsApp"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <WhatsAppIcon className="h-4 w-4" />
                              </a>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => openEdit(a)}>Düzenle</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => quickStatus(a, "Onaylandı")}>Onayla</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => quickStatus(a, "Tamamlandı")}>Tamamlandı Yap</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => quickStatus(a, "İptal Edildi")}>
                                  İptal Et
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(a)}>
                                  <Trash2 className="h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedAppointment && (
              <AppointmentDetailPanel
                appointment={selectedAppointment}
                customer={customersById[selectedAppointment.customerId]}
                onClose={() => setSelectedId(null)}
                onEdit={openEdit}
                onChanged={() => setAppointments(getAppointments())}
              />
            )}
          </div>
        </TabsContent>

        {/* Takvim view */}
        <TabsContent value="takvim" className="space-y-4">
          <Select value={calendarMode} onValueChange={setCalendarMode}>
            <SelectTrigger className="w-40">
              <SelectValue>{{ gunluk: "Günlük", aylik: "Aylık" }[calendarMode]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gunluk">Günlük</SelectItem>
              <SelectItem value="aylik">Aylık</SelectItem>
            </SelectContent>
          </Select>

          <AppointmentCalendar
            mode={calendarMode}
            appointments={appointments}
            customersById={customersById}
            onSelect={(a) => setSelectedId(a.id)}
            onCreate={openCreateForDate}
          />

          {selectedAppointment && (
            <div className="flex justify-end">
              <AppointmentDetailPanel
                appointment={selectedAppointment}
                customer={customersById[selectedAppointment.customerId]}
                onClose={() => setSelectedId(null)}
                onEdit={openEdit}
                onChanged={() => setAppointments(getAppointments())}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AppointmentFormDialog
        key={editingAppointment?.id ?? createDefaultDate?.toISOString() ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editingAppointment}
        initialDateTime={createDefaultDate}
        onSaved={() => setAppointments(getAppointments())}
      />

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Randevuyu sil"
        description={
          pendingDelete
            ? `"${customersById[pendingDelete.customerId]?.name ?? "Bu"}" randevusunu kalıcı olarak silmek istediğinize emin misiniz?`
            : ""
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        active ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}
