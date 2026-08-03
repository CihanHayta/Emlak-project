import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomerCard from "../components/CustomerCard";
import CustomerSheet from "../components/CustomerSheet";
import AppointmentFormDialog from "../components/AppointmentFormDialog";
import { getCustomers, subscribeToCustomers } from "../data/customerStore";
import { CUSTOMER_STATUSES, LEAD_SOURCES } from "../data/constants";
import { markSeen } from "../lib/lastSeen";

const ALL = "__all__";

/**
 * "/admin/musteriler" — the CRM: a searchable/filterable grid of customer
 * cards (incoming form submissions are triaged separately, on
 * /admin/basvurular, before becoming a card here). Clicking a card (or the
 * command palette's customer search) opens CustomerSheet for editing;
 * "+ Yeni Müşteri" opens it in create mode.
 */
export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState(getCustomers());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [prefill, setPrefill] = useState({});
  // Customer whose card's calendar icon (or context menu) was used to create
  // an appointment directly, without opening the full edit sheet first — the
  // new appointment shows up on Randevular immediately.
  const [appointmentTarget, setAppointmentTarget] = useState(null);

  useEffect(() => subscribeToCustomers(() => setCustomers(getCustomers())), []);
  // Sidebar'daki "Yeni" rozeti bu sayfa ziyaret edilince sıfırlanır (bkz. lib/lastSeen.js).
  useEffect(() => markSeen("musteriler"), []);

  // Deep-link support from the ⌘K command palette: ?yeni=1 opens the create
  // sheet, ?id=<customerId> opens that customer directly.
  useEffect(() => {
    if (searchParams.get("yeni")) {
      openCreate();
      setSearchParams({}, { replace: true });
    } else {
      const id = searchParams.get("id");
      if (id) {
        const target = getCustomers().find((c) => c.id === id);
        if (target) openEdit(target);
        setSearchParams({}, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate(withPrefill = {}) {
    setEditingCustomer(null);
    setPrefill(withPrefill);
    setSheetOpen(true);
  }

  function openEdit(customer) {
    setEditingCustomer(customer);
    setSheetOpen(true);
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((c) => {
      // Search matches name/phone, but also İl/İlçe and notes — typing
      // "Adana" should surface every customer interested in Adana even if
      // their name/phone doesn't mention it.
      const haystack = `${c.name} ${c.phone} ${c.desiredProvince ?? ""} ${c.desiredDistrict ?? ""} ${c.notes ?? ""}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (statusFilter !== ALL && c.status !== statusFilter) return false;
      if (sourceFilter !== ALL && c.source !== sourceFilter) return false;
      return true;
    });
  }, [customers, search, statusFilter, sourceFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, telefon, il/ilçe veya not ara..."
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm Durumlar</SelectItem>
              {CUSTOMER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm Kaynaklar</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => openCreate()} className="bg-brand-gold text-white hover:bg-brand-gold-dark">
          <UserPlus className="h-4 w-4" />
          Yeni Müşteri
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Bu kritere uygun müşteri bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={openEdit}
              onChanged={() => setCustomers(getCustomers())}
              onCreateAppointment={setAppointmentTarget}
            />
          ))}
        </div>
      )}

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customer={editingCustomer}
        prefill={prefill}
        onSaved={() => setCustomers(getCustomers())}
      />

      {appointmentTarget && (
        <AppointmentFormDialog
          key={appointmentTarget.id}
          open
          onOpenChange={(o) => !o && setAppointmentTarget(null)}
          appointment={null}
          initialCustomerId={appointmentTarget.id}
          onSaved={() => setCustomers(getCustomers())}
        />
      )}
    </div>
  );
}
