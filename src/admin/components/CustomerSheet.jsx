import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, Trash2, Clock, CalendarPlus, Info, X as XIcon, Plus } from "lucide-react";
import { InstagramIcon } from "../../components/common/BrandIcons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatThousands, parseDigits } from "../lib/formatNumber";
import {
  LEAD_SOURCES,
  CUSTOMER_STATUSES,
  INTEREST_OPTIONS,
  CUSTOMER_TAGS,
  CUSTOMER_ROLES,
} from "../data/constants";
import { TURKEY_PROVINCES } from "../../data/turkeyLocations";
import { addCustomer, updateCustomer, deleteCustomer, addTimelineEntry, getCustomers } from "../data/customerStore";
import { getListings } from "../data/listingStore";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import AppointmentFormDialog from "./AppointmentFormDialog";

const EMPTY_FORM = {
  role: "Alıcı",
  sellingListingId: "",
  name: "",
  phone: "",
  email: "",
  instagram: "",
  source: "Manuel",
  status: "Yeni",
  interests: [],
  budgetMin: "",
  budgetMax: "",
  desiredProvince: "",
  desiredDistrict: "",
  notes: "",
  tags: [],
};

function buildInitialForm(customer, prefill) {
  if (!customer) return { ...EMPTY_FORM, ...prefill };
  return {
    role: customer.role ?? "Alıcı",
    sellingListingId: customer.sellingListingId ?? "",
    name: customer.name ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    instagram: customer.instagram ?? "",
    source: customer.source ?? "Manuel",
    status: customer.status ?? "Yeni",
    interests: customer.interests ?? [],
    budgetMin: customer.budgetMin ? String(customer.budgetMin) : "",
    budgetMax: customer.budgetMax ? String(customer.budgetMax) : "",
    desiredProvince: customer.desiredProvince ?? "",
    desiredDistrict: customer.desiredDistrict ?? "",
    notes: customer.notes ?? "",
    tags: customer.tags ?? [],
  };
}

/**
 * Slide-over used for BOTH creating a new customer card and editing an
 * existing one — same form either way, so "update whenever I want" (notes,
 * status, budget, ...) and "create manually" share one code path.
 *
 * `customer=null` -> create mode (optionally pre-filled via `prefill`, used
 * when converting an incoming lead into a customer card). `customer` set ->
 * edit mode: loads that customer, shows its timeline, offers a delete button.
 *
 * The actual form lives in <CustomerSheetForm>, keyed by the customer's id
 * (or "new"). That's deliberate, not just tidiness: the form's initial
 * state is computed once, synchronously, from `customer`/`prefill` (see
 * `buildInitialForm`) instead of via a `useEffect` that patches state in
 * after mount. Populating via an effect briefly renders the location
 * <Select>s with an empty value before the real one lands, and Radix's
 * Select can misfire `onValueChange("")` during that empty->populated
 * transition — wiping the just-loaded district right back out. Keying the
 * remount means every open starts on the *correct* value from render one,
 * so that race never has a window to happen in.
 */
export default function CustomerSheet({ open, onOpenChange, customer, prefill, onSaved }) {
  // Set right after a brand-new customer is created with "Randevu da
  // oluştur" checked (see CustomerSheetForm below). Lives on this outer,
  // never-remounted wrapper — not the keyed inner form — so the follow-up
  // AppointmentFormDialog survives the Sheet closing.
  const [pendingAppointmentCustomer, setPendingAppointmentCustomer] = useState(null);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <CustomerSheetForm
              key={customer?.id ?? "new"}
              customer={customer}
              prefill={prefill}
              onOpenChange={onOpenChange}
              onSaved={onSaved}
              onCreatedWantsAppointment={setPendingAppointmentCustomer}
            />
          )}
        </SheetContent>
      </Sheet>

      {pendingAppointmentCustomer && (
        <AppointmentFormDialog
          key={pendingAppointmentCustomer.id}
          open
          onOpenChange={(o) => !o && setPendingAppointmentCustomer(null)}
          appointment={null}
          initialCustomerId={pendingAppointmentCustomer.id}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

function CustomerSheetForm({ customer, prefill, onOpenChange, onSaved, onCreatedWantsAppointment }) {
  const [form, setForm] = useState(() => buildInitialForm(customer, prefill));
  const [scheduleAppointment, setScheduleAppointment] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const isEditing = Boolean(customer);
  const listings = getListings();

  const districts = TURKEY_PROVINCES.find((p) => p.name === form.desiredProvince)?.districts ?? [];

  // Listings aren't tagged with an owner — the only place "this person sells
  // this listing" is recorded is another Satıcı customer's own
  // sellingListingId. So instead of forcing a pick from every listing, watch
  // the name field: if it's close to an existing Satıcı's name, surface
  // *their* linked listing as a one-click suggestion.
  const matchedSellerCustomer = useMemo(() => {
    const query = form.name.trim().toLowerCase();
    if (form.role !== "Satıcı" || query.length < 3) return null;
    return getCustomers().find(
      (c) =>
        c.id !== customer?.id &&
        c.role === "Satıcı" &&
        c.sellingListingId &&
        (c.name.toLowerCase() === query || c.name.toLowerCase().includes(query) || query.includes(c.name.toLowerCase())),
    );
  }, [form.role, form.name, customer]);
  const matchedListing = matchedSellerCustomer
    ? listings.find((l) => l.id === matchedSellerCustomer.sellingListingId)
    : null;
  const linkedListing = form.sellingListingId ? listings.find((l) => l.id === form.sellingListingId) : null;

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleListValue(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      budgetMin: form.budgetMin === "" ? 0 : Number(form.budgetMin),
      budgetMax: form.budgetMax === "" ? 0 : Number(form.budgetMax),
    };

    if (isEditing) {
      const statusChanged = customer.status !== payload.status;
      updateCustomer(customer.id, payload);
      if (statusChanged) addTimelineEntry(customer.id, `Durum güncellendi: ${payload.status}`);
      toast.success("Müşteri kartı güncellendi.");
    } else {
      const newCustomer = addCustomer(payload);
      toast.success("Müşteri kartı oluşturuldu.");
      if (scheduleAppointment) onCreatedWantsAppointment?.(newCustomer);
    }
    onSaved?.();
    onOpenChange(false);
  }

  function handleDelete() {
    if (!customer) return;
    deleteCustomer(customer.id);
    toast.success("Müşteri kartı silindi.");
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEditing ? customer.name : "Yeni Müşteri Kartı"}</SheetTitle>
        <SheetDescription>
          {isEditing
            ? "Müşteri bilgilerini istediğiniz zaman güncelleyebilirsiniz."
            : "Manuel olarak yeni bir müşteri kartı oluşturun."}
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
        {/* Buyer/seller role */}
        <section className="space-y-3">
          <div className="space-y-1.5">
            <Label>Müşteri Tipi</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger className="w-full"><SelectValue>{form.role}</SelectValue></SelectTrigger>
              <SelectContent>
                {CUSTOMER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.role === "Satıcı" && (
            <div className="space-y-2">
              <Label>Sattığı / Kiraladığı İlan</Label>

              {/* Same-name existing seller found: suggest linking to *their*
                  listing instead of making every card browse all listings. */}
              {matchedListing && form.sellingListingId !== matchedListing.id && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="flex-1">
                    <p>
                      <strong>{matchedSellerCustomer.name}</strong> adında bir müşterinin zaten “{matchedListing.title}” ilanı var — bilginiz olsun.
                    </p>
                    <button
                      type="button"
                      onClick={() => set("sellingListingId", matchedListing.id)}
                      className="mt-1.5 font-semibold text-amber-900 underline"
                    >
                      Bu ilanı bu karta bağla
                    </button>
                  </div>
                </div>
              )}

              {linkedListing ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                  <span className="truncate">{linkedListing.title} — #{linkedListing.listingNo}</span>
                  <button
                    type="button"
                    onClick={() => set("sellingListingId", "")}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Bağlantıyı kaldır"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : showListingPicker ? (
                <Select value={form.sellingListingId} onValueChange={(v) => set("sellingListingId", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="İlan seçin" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {listings.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.title} — #{l.listingNo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowListingPicker(true)}
                  className="text-xs font-medium text-brand-gold-dark hover:underline"
                >
                  + İlan bağla (opsiyonel)
                </button>
              )}

              <p className="text-xs text-muted-foreground">
                Bağlı ilan uzun süredir satılmadıysa kartta bir hatırlatma göreceksiniz.
              </p>
            </div>
          )}
        </section>

        <Separator />

        {/* Contact */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">İletişim Bilgileri</h3>
          <div className="space-y-1.5">
            <Label htmlFor="c-name">İsim</Label>
            <Input id="c-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">
              <Phone className="h-3.5 w-3.5" /> Telefon
            </Label>
            <Input
              id="c-phone"
              required
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="05XX XXX XX XX"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">
                <Mail className="h-3.5 w-3.5" /> Mail
              </Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-instagram">
                <InstagramIcon className="h-3.5 w-3.5" /> Instagram
              </Label>
              <Input
                id="c-instagram"
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="@kullaniciadi"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Source + status */}
        <section className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Kaynağı</Label>
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger className="w-full"><SelectValue>{form.source}</SelectValue></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-full"><SelectValue>{form.status}</SelectValue></SelectTrigger>
              <SelectContent>
                {CUSTOMER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* Interests */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">İlgilendiği</h3>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((option) => {
              const active = form.interests.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleListValue("interests", option)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    active
                      ? "border-brand-gold bg-brand-gold/10 text-brand-gold-dark"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* Budget */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Bütçe (TL)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-budget-min">Min</Label>
              <Input
                id="c-budget-min"
                type="text"
                inputMode="numeric"
                value={formatThousands(form.budgetMin)}
                onChange={(e) => set("budgetMin", parseDigits(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-budget-max">Max</Label>
              <Input
                id="c-budget-max"
                type="text"
                inputMode="numeric"
                value={formatThousands(form.budgetMax)}
                onChange={(e) => set("budgetMax", parseDigits(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Desired location */}
        <section className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>İstediği İl</Label>
            <Select
              value={form.desiredProvince}
              onValueChange={(v) =>
                setForm((prev) => (v === prev.desiredProvince ? prev : { ...prev, desiredProvince: v, desiredDistrict: "" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="İl seçin">{form.desiredProvince || undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TURKEY_PROVINCES.map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>İstediği İlçe</Label>
            <Select value={form.desiredDistrict} onValueChange={(v) => set("desiredDistrict", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Önce il seçin">{form.desiredDistrict || undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* Notes */}
        <section className="space-y-1.5">
          <Label htmlFor="c-notes">Özel Notlar</Label>
          <Textarea
            id="c-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder={"Örneğin: Çocuklu aile, sessiz mahalle istiyor, metroya yakın olsun, nakit alacak..."}
          />
        </section>

        <Separator />

        {/* Tags */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Etiket Sistemi</h3>
          <div className="flex flex-wrap gap-3">
            {CUSTOMER_TAGS.map((tag) => (
              <label key={tag} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={form.tags.includes(tag)}
                  onCheckedChange={() => toggleListValue("tags", tag)}
                />
                {tag}
              </label>
            ))}
          </div>

          {/* Kendi etiketiniz — free-form tags beyond the preset list above. */}
          {form.tags.filter((t) => !CUSTOMER_TAGS.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.filter((t) => !CUSTOMER_TAGS.includes(t)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleListValue("tags", tag)}
                  className="rounded-full border border-brand-gold bg-brand-gold/10 px-3 py-1 text-xs font-medium text-brand-gold-dark"
                >
                  {tag} ×
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = customTag.trim();
                  if (value && !form.tags.includes(value)) toggleListValue("tags", value);
                  setCustomTag("");
                }
              }}
              placeholder="Kendi etiketinizi yazıp Enter'a basın"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const value = customTag.trim();
                if (value && !form.tags.includes(value)) toggleListValue("tags", value);
                setCustomTag("");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Ekle
            </Button>
          </div>
        </section>

        {/* Timeline (edit mode only) */}
        {isEditing && customer.timeline?.length > 0 && (
          <>
            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Timeline</h3>
              <ul className="space-y-2">
                {[...customer.timeline].reverse().map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 text-sm">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p>{entry.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {!isEditing && (
          <>
            <Separator />
            <section>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={scheduleAppointment} onCheckedChange={setScheduleAppointment} />
                <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />
                Kartı oluşturduktan sonra randevu da oluştur
              </label>
            </section>
          </>
        )}

        <SheetFooter className="mt-auto flex-row gap-2 px-0">
          {isEditing && (
            <Button type="button" variant="destructive" size="icon" onClick={() => setConfirmOpen(true)} aria-label="Müşteriyi Sil">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button type="submit" className="flex-1 bg-brand-gold text-white hover:bg-brand-gold-dark">
            {isEditing ? "Kaydet" : "Oluştur"}
          </Button>
        </SheetFooter>
      </form>

      {isEditing && (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Müşteri kartını sil"
          description={`"${customer.name}" kartını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
