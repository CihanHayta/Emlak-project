import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getListingById, addListing, updateListing } from "../data/listingStore";
import { getCustomers } from "../data/customerStore";
import { findMatchingCustomers } from "../lib/matchCustomers";
import { formatThousands, parseDigits } from "../lib/formatNumber";
import MatchedCustomersDialog from "../components/MatchedCustomersDialog";
import MediaUploadField from "../components/MediaUploadField";
import { TURKEY_PROVINCES } from "../../data/turkeyLocations";
import { ISTANBUL_DISTRICTS } from "../../data/istanbulLocations";
import { cn } from "@/lib/utils";

const ROOM_OPTIONS = ["1+1", "2+1", "3+1", "4+1", "5+1", "6+1"];
const ZONING_OPTIONS = ["Konut İmarlı", "Ticari İmarlı", "Tarla", "Bağ-Bahçe İmarlı"];
const AMENITY_OPTIONS = [
  "Otopark", "Kapalı Otopark", "Asansör", "Güvenlik", "Isı Yalıtımı", "Doğalgaz",
  "Eşyalı", "Balkon", "Site İçinde", "Deniz Manzaralı", "Özel Havuz", "Ortak Yüzme Havuzu",
  "Bahçe", "Akıllı Ev Sistemi", "Fitness Salonu", "Çocuk Oyun Alanı",
  "Elektrik Mevcut", "Su Mevcut", "Yola Cephe", "Köşe Parsel",
];

function buildInitialForm(listing) {
  if (!listing) {
    return {
      category: "satilik",
      type: "Daire",
      title: "",
      price: "",
      province: "İstanbul",
      district: "",
      neighborhood: "",
      street: "",
      rooms: "2+1",
      area: "",
      floor: "",
      zoningStatus: ZONING_OPTIONS[0],
      description: "",
      amenities: [],
      customAmenity: "",
      photoRefs: [],
      videoRefs: [],
      showLocation: true,
    };
  }
  return {
    category: listing.category ?? "satilik",
    type: listing.type ?? "Daire",
    title: listing.title ?? "",
    // Stored as a display string like "2.750.000 TL" — pull just the
    // digits back out so the formatted input starts from the right value.
    price: parseDigits(listing.price ?? ""),
    province: listing.province ?? "İstanbul",
    district: listing.district ?? "",
    neighborhood: listing.neighborhood ?? "",
    street: listing.street ?? "",
    rooms: listing.rooms ?? "2+1",
    area: listing.area ?? "",
    floor: listing.floor ?? "",
    zoningStatus: listing.zoningStatus ?? ZONING_OPTIONS[0],
    description: listing.description ?? "",
    amenities: listing.amenities ?? [],
    customAmenity: "",
    // Both fields accept a mix of plain URLs (existing sample photos) and
    // "idb:" references (freshly uploaded files) — MediaUploadField/
    // useResolvedMediaUrl treat the two the same way.
    photoRefs: listing.images?.length ? listing.images : listing.image ? [listing.image] : [],
    videoRefs: listing.videoUrl ? [listing.videoUrl] : [],
    showLocation: listing.showLocation ?? true,
  };
}

/**
 * "/admin/ilanlar/yeni" (create) and "/admin/ilanlar/:id" (edit) — same
 * form either way. Keyed by `id` in App.jsx-adjacent usage isn't needed
 * here since this *is* the routed page component and each id gets its own
 * navigation; the form still computes its initial state once, lazily, from
 * the loaded listing (see buildInitialForm) rather than via a post-mount
 * effect — same reasoning as CustomerSheet: syncing state in after mount
 * briefly renders the location <Select>s with an empty value, which Radix
 * can misinterpret as a real change and clear right back out.
 */
export default function ListingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existingListing = id ? getListingById(id) : null;
  const isEditing = Boolean(existingListing);

  const [form, setForm] = useState(() => buildInitialForm(existingListing));
  const [matchDialog, setMatchDialog] = useState(null);
  const isArsa = form.type === "Arsa";
  const isIstanbul = form.province === "İstanbul";

  const districts = isIstanbul
    ? ISTANBUL_DISTRICTS.map((d) => d.name)
    : TURKEY_PROVINCES.find((p) => p.name === form.province)?.districts ?? [];

  const neighborhoods = isIstanbul
    ? ISTANBUL_DISTRICTS.find((d) => d.name === form.district)?.neighborhoods ?? []
    : [];

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAmenity(value) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(value)
        ? prev.amenities.filter((a) => a !== value)
        : [...prev.amenities, value],
    }));
  }

  function addCustomAmenity() {
    const value = form.customAmenity.trim();
    if (!value || form.amenities.includes(value)) return;
    setForm((prev) => ({ ...prev, amenities: [...prev.amenities, value], customAmenity: "" }));
  }

  const addressLine = [form.street, form.neighborhood, form.district, form.province].filter(Boolean).join(", ");
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine)}`;

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      category: form.category,
      type: form.type,
      title: form.title,
      price: form.price ? `${formatThousands(form.price)} TL` : "",
      province: form.province,
      district: form.district,
      neighborhood: form.neighborhood,
      street: form.street,
      description: form.description,
      amenities: form.amenities,
      image: form.photoRefs[0] ?? "",
      images: form.photoRefs,
      hasVideo: form.videoRefs.length > 0,
      videoUrl: form.videoRefs[0],
      videoRefs: form.videoRefs,
      showLocation: form.showLocation,
      ...(isArsa
        ? { area: Number(form.area) || 0, zoningStatus: form.zoningStatus, rooms: undefined, floor: undefined }
        : { area: Number(form.area) || 0, rooms: form.rooms, floor: form.floor, zoningStatus: undefined }),
    };

    if (isEditing) {
      updateListing(existingListing.id, payload);
      toast.success("İlan güncellendi.");
      navigate("/admin/ilanlar");
    } else {
      const newListing = addListing(payload);
      toast.success("İlan yayınlandı.");
      // Only for brand-new listings: immediately show which existing
      // customers might want it, with a one-click WhatsApp message each.
      const matches = findMatchingCustomers(newListing, getCustomers());
      setMatchDialog({ listing: newListing, matches });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 pb-10">
      {/* Type + category */}
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border p-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>İlan Durumu</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{form.category === "satilik" ? "Satılık" : "Kiralık"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="satilik">Satılık</SelectItem>
              <SelectItem value="kiralik">Kiralık</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Emlak Tipi</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger className="w-full"><SelectValue>{form.type}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="Daire">Daire</SelectItem>
              <SelectItem value="Müstakil">Müstakil</SelectItem>
              <SelectItem value="Arsa">Arsa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="l-price">Fiyat (TL)</Label>
          <Input
            id="l-price"
            required
            type="text"
            inputMode="numeric"
            value={formatThousands(form.price)}
            onChange={(e) => set("price", parseDigits(e.target.value))}
            placeholder="Örn: 2.750.000"
          />
        </div>
      </section>

      {/* Title + description */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <div className="space-y-1.5">
          <Label htmlFor="l-title">İlan Başlığı</Label>
          <Input id="l-title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="l-desc">Açıklama</Label>
          <Textarea id="l-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Özellikler</Label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((option) => {
              const active = form.amenities.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleAmenity(option)}
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
            {form.amenities.filter((a) => !AMENITY_OPTIONS.includes(a)).map((custom) => (
              <button
                key={custom}
                type="button"
                onClick={() => toggleAmenity(custom)}
                className="rounded-full border border-brand-gold bg-brand-gold/10 px-3 py-1 text-xs font-medium text-brand-gold-dark"
              >
                {custom} ×
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={form.customAmenity}
              onChange={(e) => set("customAmenity", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomAmenity();
                }
              }}
              placeholder="Listede yok mu? Yazıp Enter'a basın"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addCustomAmenity}>Ekle</Button>
          </div>
        </div>
      </section>

      {/* Specs (type-aware) */}
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border p-5 sm:grid-cols-3">
        {isArsa ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="l-area">Alan (m²)</Label>
              <Input id="l-area" type="number" min="0" required value={form.area} onChange={(e) => set("area", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>İmar Durumu</Label>
              <Select value={form.zoningStatus} onValueChange={(v) => set("zoningStatus", v)}>
                <SelectTrigger className="w-full"><SelectValue>{form.zoningStatus}</SelectValue></SelectTrigger>
                <SelectContent>
                  {ZONING_OPTIONS.map((z) => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Oda Sayısı</Label>
              <Select value={form.rooms} onValueChange={(v) => set("rooms", v)}>
                <SelectTrigger className="w-full"><SelectValue>{form.rooms}</SelectValue></SelectTrigger>
                <SelectContent>
                  {ROOM_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-area2">Alan (m²)</Label>
              <Input id="l-area2" type="number" min="0" required value={form.area} onChange={(e) => set("area", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-floor">Kat</Label>
              <Input id="l-floor" required value={form.floor} onChange={(e) => set("floor", e.target.value)} placeholder="Örn: 5. Kat" />
            </div>
          </>
        )}
      </section>

      {/* Location */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Konum</h3>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={form.showLocation} onCheckedChange={(v) => set("showLocation", v)} />
            Haritada konumu göster
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>İl</Label>
            <Select
              value={form.province}
              onValueChange={(v) => setForm((prev) => (v === prev.province ? prev : { ...prev, province: v, district: "", neighborhood: "" }))}
            >
              <SelectTrigger className="w-full"><SelectValue>{form.province}</SelectValue></SelectTrigger>
              <SelectContent className="max-h-64">
                {TURKEY_PROVINCES.map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>İlçe</Label>
            <Select
              value={form.district}
              onValueChange={(v) => setForm((prev) => (v === prev.district ? prev : { ...prev, district: v, neighborhood: "" }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="İlçe seçin">{form.district || undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mahalle</Label>
            {isIstanbul ? (
              <Select value={form.neighborhood} onValueChange={(v) => set("neighborhood", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Önce ilçe seçin">{form.neighborhood || undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {neighborhoods.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Mahalle adı" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-street">Sokak / Cadde</Label>
            <Input id="l-street" value={form.street} onChange={(e) => set("street", e.target.value)} />
          </div>
        </div>

        {form.showLocation && addressLine && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {addressLine}
            </span>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm">
                <Navigation className="h-3.5 w-3.5" />
                Yol Tarifi Önizle
              </Button>
            </a>
          </div>
        )}
      </section>

      {/* Media — real file uploads (stored in the browser via IndexedDB,
          see lib/mediaStore.js), not links/URLs. Multiple photos and
          multiple videos are both supported. */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Fotoğraf ve Video</h3>
        <p className="-mt-2 text-xs text-muted-foreground">
          İlk eklediğiniz fotoğraf kapak fotoğrafı olarak kullanılır.
        </p>

        <MediaUploadField
          label="Fotoğraflar"
          accept="image/*"
          value={form.photoRefs}
          onChange={(refs) => set("photoRefs", refs)}
        />

        <MediaUploadField
          label="Videolar"
          accept="video/*"
          isVideo
          value={form.videoRefs}
          onChange={(refs) => set("videoRefs", refs)}
        />
      </section>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate("/admin/ilanlar")}>
          Vazgeç
        </Button>
        <Button type="submit" className="bg-brand-gold text-white hover:bg-brand-gold-dark">
          {isEditing ? "Kaydet" : "İlanı Yayınla"}
        </Button>
      </div>

      <MatchedCustomersDialog
        open={matchDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMatchDialog(null);
            navigate("/admin/ilanlar");
          }
        }}
        listing={matchDialog?.listing}
        matches={matchDialog?.matches ?? []}
      />
    </form>
  );
}
