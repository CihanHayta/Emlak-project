import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, CalendarDays, MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "../components/StatCard";
import SalesPipeline from "../components/SalesPipeline";
import { getSaleProperties, getRentProperties } from "../../data/properties";
import { getCustomers, subscribeToCustomers } from "../data/customerStore";
import { getAppointments, subscribeToAppointments } from "../data/appointmentStore";
import { getLeads, subscribeToLeads } from "../../lib/leadStore";
import { toMillis } from "../../lib/firestoreTimestamp";
import { APPOINTMENT_STATUS_STYLES } from "../data/constants";
import { cn } from "@/lib/utils";

/** "/admin" — landing page after login: at-a-glance stats + recent activity. */
export default function Dashboard() {
  const [customers, setCustomers] = useState(getCustomers());
  const [appointments, setAppointments] = useState(getAppointments());
  const [leads, setLeads] = useState(getLeads());

  useEffect(() => {
    const unsubCustomers = subscribeToCustomers(() => setCustomers(getCustomers()));
    const unsubAppointments = subscribeToAppointments(() => setAppointments(getAppointments()));
    const unsubLeads = subscribeToLeads(() => setLeads(getLeads()));
    return () => {
      unsubCustomers();
      unsubAppointments();
      unsubLeads();
    };
  }, []);

  const saleCount = getSaleProperties().length;
  const rentCount = getRentProperties().length;
  const totalListings = saleCount + rentCount;
  const upcomingAppointments = appointments.filter(
    (a) => a.dateTime > Date.now() && a.status !== "İptal Edildi",
  );
  const nextAppointments = upcomingAppointments.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} tone="blue" value={totalListings} label="Toplam İlan" sublabel={`${saleCount} Satılık · ${rentCount} Kiralık`} />
        <StatCard icon={Users} tone="violet" value={customers.length} label="Müşteri" sublabel="CRM kayıtları" />
        <StatCard
          icon={CalendarDays}
          tone="amber"
          value={upcomingAppointments.length}
          label="Yaklaşan Randevu"
          sublabel="Bugün ve sonrası"
        />
        <StatCard icon={MessageSquare} tone="green" value={leads.length} label="Gelen Form" sublabel="Henüz işlenmedi" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Yaklaşan Randevular</CardTitle>
            <Link to="/admin/randevular" className="flex items-center gap-1 text-sm text-brand-gold-dark hover:underline">
              Tümünü Gör <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextAppointments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Yaklaşan randevu yok.</p>
            )}
            {nextAppointments.map((appt) => {
              const customer = customers.find((c) => c.id === appt.customerId);
              return (
                <div key={appt.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{customer?.name ?? "Müşteri"}</p>
                    <p className="truncate text-xs text-muted-foreground">{appt.listing?.title ?? "İlan"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(appt.dateTime).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", APPOINTMENT_STATUS_STYLES[appt.status])}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Incoming leads */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Gelen Formlar</CardTitle>
            <Link to="/admin/basvurular" className="flex items-center gap-1 text-sm text-brand-gold-dark hover:underline">
              Tümünü Gör <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2.5 overflow-y-auto sm:max-h-80">
            {leads.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Henüz form gelmedi.</p>
            )}
            {leads.slice(0, 8).map((lead) => (
              <div key={lead.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{lead.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(toMillis(lead.createdAt)).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{lead.context}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Satış Hattı</CardTitle>
          <p className="text-sm text-muted-foreground">
            Müşterileri sürükleyip bırakarak durumlarını güncelleyin.
          </p>
        </CardHeader>
        <CardContent>
          <SalesPipeline customers={customers} leads={leads} onChanged={() => setCustomers(getCustomers())} />
        </CardContent>
      </Card>
    </div>
  );
}
