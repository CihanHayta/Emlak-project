import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVehicleById, addVehicle, updateVehicle } from "../data/vehicleStore";
import { formatThousands, parseDigits } from "../lib/formatNumber";
import MediaUploadField from "../components/MediaUploadField";
import PhotoManagerList from "../components/PhotoManagerList";
import PdfUploadField from "../components/PdfUploadField";

const FUEL_OPTIONS = ["Benzin", "Dizel", "LPG", "Elektrik", "Hibrit"];
const TRANSMISSION_OPTIONS = ["Manuel", "Otomatik"];
const BODY_TYPE_OPTIONS = ["Sedan", "Hatchback", "SUV", "Crossover", "Coupe", "Cabrio", "Station Wagon", "Pickup", "Panelvan", "MPV"];
const DRIVETRAIN_OPTIONS = ["Önden Çekiş", "Arkadan İtiş", "4x4"];
const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "reserved", label: "Rezerve" },
  { value: "sold", label: "Satıldı" },
  { value: "unpublished", label: "Yayından Kaldırıldı" },
];
const PART_STATUS_OPTIONS = ["Orijinal", "Boyalı", "Lokal Boyalı", "Değişen"];
const PART_NAME_OPTIONS = [
  "Ön Tampon", "Arka Tampon", "Kaput", "Tavan", "Bagaj Kapağı",
  "Sağ Ön Çamurluk", "Sol Ön Çamurluk", "Sağ Arka Çamurluk", "Sol Arka Çamurluk",
  "Sağ Ön Kapı", "Sol Ön Kapı", "Sağ Arka Kapı", "Sol Arka Kapı",
];
const EQUIPMENT_OPTIONS = [
  "Sunroof", "Panoramik Cam Tavan", "Deri Koltuk", "Isıtmalı Koltuk", "Soğutmalı Koltuk",
  "Geri Görüş Kamerası", "360° Kamera", "Park Sensörü", "Apple CarPlay", "Android Auto",
  "Adaptif Hız Sabitleyici", "Şerit Takip Sistemi", "Kör Nokta Uyarı Sistemi", "LED Far",
  "Xenon Far", "Elektrikli Koltuk", "Hafızalı Koltuk", "Anahtarsız Çalıştırma",
  "Elektrikli Bagaj", "Head-up Display",
];
const DOCUMENT_TYPE_OPTIONS = [
  { value: "servis", label: "Servis Kaydı" },
  { value: "tramer", label: "Tramer Belgesi" },
  { value: "garanti", label: "Garanti Belgesi" },
  { value: "diger", label: "Diğer Belge" },
];

function buildInitialForm(vehicle) {
  if (!vehicle) {
    return {
      category: "satilik",
      brand: "",
      model: "",
      year: "",
      km: "",
      fuelType: FUEL_OPTIONS[0],
      transmission: TRANSMISSION_OPTIONS[0],
      bodyType: "",
      engineSize: "",
      enginePower: "",
      drivetrain: "",
      color: "",
      title: "",
      price: "",
      negotiable: false,
      tradeIn: false,
      creditEligible: false,
      status: "active",
      tramerRecord: "",
      damageAmount: "",
      changedPartsCount: "",
      paintedPartsCount: "",
      localPaintedPartsCount: "",
      partsStatus: [],
      equipment: [],
      description: "",
      photoRefs: [],
      imageCategories: {},
      videoRefs: [],
      history: [],
      expertiseReport: null,
      documents: [],
      adminNotes: "",
    };
  }
  return {
    category: vehicle.category ?? "satilik",
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year ?? "",
    km: vehicle.km ?? "",
    fuelType: vehicle.fuelType ?? FUEL_OPTIONS[0],
    transmission: vehicle.transmission ?? TRANSMISSION_OPTIONS[0],
    bodyType: vehicle.bodyType ?? "",
    engineSize: vehicle.engineSize ?? "",
    enginePower: vehicle.enginePower ?? "",
    drivetrain: vehicle.drivetrain ?? "",
    color: vehicle.color ?? "",
    title: vehicle.title ?? "",
    // property.model.js'teki price ile aynı desen: hazır biçimlendirilmiş
    // gösterim string'i ("450.000 TL") — sadece rakamları geri çıkar.
    price: parseDigits(vehicle.price ?? ""),
    negotiable: vehicle.negotiable ?? false,
    tradeIn: vehicle.tradeIn ?? false,
    creditEligible: vehicle.creditEligible ?? false,
    status: vehicle.status ?? "active",
    tramerRecord: vehicle.tramerRecord ?? "",
    damageAmount: vehicle.damageAmount || "",
    changedPartsCount: vehicle.changedPartsCount || "",
    paintedPartsCount: vehicle.paintedPartsCount || "",
    localPaintedPartsCount: vehicle.localPaintedPartsCount || "",
    partsStatus: vehicle.partsStatus ?? [],
    equipment: vehicle.equipment ?? [],
    description: vehicle.description ?? "",
    photoRefs: vehicle.images?.length ? vehicle.images : vehicle.image ? [vehicle.image] : [],
    imageCategories: vehicle.imageCategories ?? {},
    videoRefs: vehicle.videoUrl ? [vehicle.videoUrl] : [],
    history: vehicle.history ?? [],
    expertiseReport: vehicle.expertiseReportUrl ? { url: vehicle.expertiseReportUrl, name: vehicle.expertiseReportName } : null,
    documents: vehicle.documents ?? [],
    adminNotes: vehicle.adminNotes ?? "",
  };
}

/** "/admin/araclar/yeni" (create) ve "/admin/araclar/:id" (edit) — ListingForm.jsx ile aynı desen, araç alanlarına uyarlanmış. */
export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existingVehicle = id ? getVehicleById(id) : null;
  const isEditing = Boolean(existingVehicle);

  const [form, setForm] = useState(() => buildInitialForm(existingVehicle));
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleEquipment(value) {
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(value) ? prev.equipment.filter((e) => e !== value) : [...prev.equipment, value],
    }));
  }

  function addPartStatus() {
    setForm((prev) => ({ ...prev, partsStatus: [...prev.partsStatus, { part: PART_NAME_OPTIONS[0], status: PART_STATUS_OPTIONS[0] }] }));
  }
  function updatePartStatus(index, field, value) {
    setForm((prev) => ({
      ...prev,
      partsStatus: prev.partsStatus.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }
  function removePartStatus(index) {
    setForm((prev) => ({ ...prev, partsStatus: prev.partsStatus.filter((_, i) => i !== index) }));
  }

  function addHistoryEntry() {
    setForm((prev) => ({ ...prev, history: [...prev.history, { date: "", km: "", action: "", description: "" }] }));
  }
  function updateHistoryEntry(index, field, value) {
    setForm((prev) => ({
      ...prev,
      history: prev.history.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }
  function removeHistoryEntry(index) {
    setForm((prev) => ({ ...prev, history: prev.history.filter((_, i) => i !== index) }));
  }

  function addDocument(type, uploaded) {
    setForm((prev) => ({ ...prev, documents: [...prev.documents, { type, url: uploaded.url, name: uploaded.name }] }));
  }
  function removeDocument(index) {
    setForm((prev) => ({ ...prev, documents: prev.documents.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      category: form.category,
      brand: form.brand,
      model: form.model,
      year: Number(form.year) || null,
      km: Number(form.km) || 0,
      fuelType: form.fuelType,
      transmission: form.transmission,
      bodyType: form.bodyType,
      engineSize: form.engineSize,
      enginePower: form.enginePower,
      drivetrain: form.drivetrain,
      color: form.color,
      title: form.title,
      price: form.price ? `${formatThousands(form.price)} TL` : "",
      negotiable: form.negotiable,
      tradeIn: form.tradeIn,
      creditEligible: form.creditEligible,
      status: form.status,
      tramerRecord: form.tramerRecord,
      damageAmount: Number(form.damageAmount) || 0,
      changedPartsCount: Number(form.changedPartsCount) || 0,
      paintedPartsCount: Number(form.paintedPartsCount) || 0,
      localPaintedPartsCount: Number(form.localPaintedPartsCount) || 0,
      partsStatus: form.partsStatus,
      equipment: form.equipment,
      description: form.description,
      image: form.photoRefs[0] ?? "",
      images: form.photoRefs,
      imageCategories: form.imageCategories,
      hasVideo: form.videoRefs.length > 0,
      videoUrl: form.videoRefs[0],
      history: form.history,
      expertiseReportUrl: form.expertiseReport?.url ?? null,
      expertiseReportName: form.expertiseReport?.name ?? null,
      documents: form.documents,
      adminNotes: form.adminNotes,
    };

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateVehicle(existingVehicle.id, payload);
        toast.success("Araç güncellendi.");
      } else {
        await addVehicle(payload);
        toast.success("Araç ilanı yayınlandı.");
      }
      navigate("/admin/araclar");
    } catch (error) {
      toast.error(error.message || "Araç kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 pb-10">
      {/* Durum + fiyat */}
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border p-5 sm:grid-cols-2">
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
          <Label htmlFor="v-price">Fiyat (TL)</Label>
          <Input
            id="v-price"
            required
            type="text"
            inputMode="numeric"
            value={formatThousands(form.price)}
            onChange={(e) => set("price", parseDigits(e.target.value))}
            placeholder="Örn: 850.000"
          />
        </div>
      </section>

      {/* Başlık + açıklama */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <div className="space-y-1.5">
          <Label htmlFor="v-title">İlan Başlığı</Label>
          <Input id="v-title" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Örn: 2022 Toyota Corolla Hibrit" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-desc">Açıklama</Label>
          <Textarea id="v-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
      </section>

      {/* Araç özellikleri */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Araç Özellikleri</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="v-brand">Marka</Label>
            <Input id="v-brand" required value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Örn: Toyota" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-model">Model</Label>
            <Input id="v-model" required value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Örn: Corolla" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-color">Renk</Label>
            <Input id="v-color" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Örn: Beyaz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-year">Model Yılı</Label>
            <Input id="v-year" type="number" min="1950" max="2100" required value={form.year} onChange={(e) => set("year", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-km">Kilometre</Label>
            <Input id="v-km" type="number" min="0" required value={form.km} onChange={(e) => set("km", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Yakıt Tipi</Label>
            <Select value={form.fuelType} onValueChange={(v) => set("fuelType", v)}>
              <SelectTrigger className="w-full"><SelectValue>{form.fuelType}</SelectValue></SelectTrigger>
              <SelectContent>
                {FUEL_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vites Tipi</Label>
            <Select value={form.transmission} onValueChange={(v) => set("transmission", v)}>
              <SelectTrigger className="w-full"><SelectValue>{form.transmission}</SelectValue></SelectTrigger>
              <SelectContent>
                {TRANSMISSION_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kasa Tipi</Label>
            <Select value={form.bodyType || undefined} onValueChange={(v) => set("bodyType", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seçin">{form.bodyType || undefined}</SelectValue></SelectTrigger>
              <SelectContent>
                {BODY_TYPE_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Çekiş Tipi</Label>
            <Select value={form.drivetrain || undefined} onValueChange={(v) => set("drivetrain", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seçin">{form.drivetrain || undefined}</SelectValue></SelectTrigger>
              <SelectContent>
                {DRIVETRAIN_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-engine-size">Motor Hacmi</Label>
            <Input id="v-engine-size" value={form.engineSize} onChange={(e) => set("engineSize", e.target.value)} placeholder="Örn: 1.6" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-engine-power">Motor Gücü</Label>
            <Input id="v-engine-power" value={form.enginePower} onChange={(e) => set("enginePower", e.target.value)} placeholder="Örn: 132 HP" />
          </div>
        </div>
      </section>

      {/* Satış bilgileri */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Satış Bilgileri</h3>
        <div className="space-y-1.5">
          <Label>İlan Durumu</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue>{STATUS_OPTIONS.find((s) => s.value === form.status)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <Switch checked={form.negotiable} onCheckedChange={(v) => set("negotiable", v)} />
            Pazarlık Payı Var
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <Switch checked={form.tradeIn} onCheckedChange={(v) => set("tradeIn", v)} />
            Takas Yapılır
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <Switch checked={form.creditEligible} onCheckedChange={(v) => set("creditEligible", v)} />
            Krediye Uygun
          </label>
        </div>
      </section>

      {/* Hasar / Ekspertiz bilgileri */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Hasar / Ekspertiz Bilgileri</h3>
        <div className="space-y-1.5">
          <Label htmlFor="v-tramer">Tramer Kaydı</Label>
          <Input id="v-tramer" value={form.tramerRecord} onChange={(e) => set("tramerRecord", e.target.value)} placeholder="Örn: Yok, ya da 12.500 TL - sol ön çamurluk" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="v-damage-amount">Hasar Tutarı (TL)</Label>
            <Input id="v-damage-amount" type="number" min="0" value={form.damageAmount} onChange={(e) => set("damageAmount", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-changed-count">Değişen Parça</Label>
            <Input id="v-changed-count" type="number" min="0" value={form.changedPartsCount} onChange={(e) => set("changedPartsCount", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-painted-count">Boyalı Parça</Label>
            <Input id="v-painted-count" type="number" min="0" value={form.paintedPartsCount} onChange={(e) => set("paintedPartsCount", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-local-painted-count">Lokal Boyalı</Label>
            <Input id="v-local-painted-count" type="number" min="0" value={form.localPaintedPartsCount} onChange={(e) => set("localPaintedPartsCount", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Parça Durumları</Label>
          {form.partsStatus.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select value={row.part} onValueChange={(v) => updatePartStatus(index, "part", v)}>
                <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue>{row.part}</SelectValue></SelectTrigger>
                <SelectContent>
                  {PART_NAME_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={row.status} onValueChange={(v) => updatePartStatus(index, "status", v)}>
                <SelectTrigger className="h-9 w-40 text-sm"><SelectValue>{row.status}</SelectValue></SelectTrigger>
                <SelectContent>
                  {PART_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button type="button" onClick={() => removePartStatus(index)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addPartStatus}>
            <Plus className="h-3.5 w-3.5" />
            Parça Ekle
          </Button>
        </div>
      </section>

      {/* Donanımlar */}
      <section className="space-y-3 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Donanımlar</h3>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((option) => {
            const active = form.equipment.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleEquipment(option)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active ? "border-brand-gold bg-brand-gold/10 text-brand-gold-dark" : "border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </section>

      {/* Medya */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Fotoğraf ve Video</h3>
        <p className="-mt-2 text-xs text-muted-foreground">
          İlk eklediğiniz fotoğraf kapak fotoğrafı olarak kullanılır — sırayı aşağıdan değiştirebilirsiniz.
        </p>

        <MediaUploadField
          label="Fotoğraflar"
          accept="image/*"
          value={form.photoRefs}
          onChange={(refs) => set("photoRefs", refs)}
        />

        <PhotoManagerList
          photoRefs={form.photoRefs}
          categories={form.imageCategories}
          onReorder={(next) => set("photoRefs", next)}
          onCategoryChange={(url, category) => set("imageCategories", { ...form.imageCategories, [url]: category })}
        />

        <MediaUploadField
          label="Videolar"
          accept="video/*"
          isVideo
          value={form.videoRefs}
          onChange={(refs) => set("videoRefs", refs)}
        />
      </section>

      {/* Ekspertiz raporu */}
      <section className="space-y-4 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Ekspertiz Raporu</h3>
        <p className="-mt-2 text-xs text-muted-foreground">
          Sadece PDF yüklenebilir (en fazla 10MB) — araç detay sayfasında kilometre yanında görünür.
        </p>
        <PdfUploadField label="Ekspertiz Raporu (PDF)" value={form.expertiseReport} onChange={(value) => set("expertiseReport", value)} />
      </section>

      {/* Bakım / Araç Geçmişi */}
      <section className="space-y-3 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Bakım / Araç Geçmişi</h3>
        {form.history.map((entry, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1.4fr_1.4fr_auto]">
            <Input type="date" value={entry.date} onChange={(e) => updateHistoryEntry(index, "date", e.target.value)} />
            <Input type="number" min="0" placeholder="KM" value={entry.km} onChange={(e) => updateHistoryEntry(index, "km", e.target.value)} />
            <Input placeholder="İşlem (örn. Periyodik bakım)" value={entry.action} onChange={(e) => updateHistoryEntry(index, "action", e.target.value)} />
            <Input placeholder="Açıklama (opsiyonel)" value={entry.description} onChange={(e) => updateHistoryEntry(index, "description", e.target.value)} />
            <button type="button" onClick={() => removeHistoryEntry(index)} className="flex h-9 w-9 shrink-0 items-center justify-center justify-self-end rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addHistoryEntry}>
          <Plus className="h-3.5 w-3.5" />
          Kayıt Ekle
        </Button>
      </section>

      {/* Belgeler (admin-only) */}
      <section className="space-y-3 rounded-2xl border border-border p-5">
        <h3 className="font-semibold">Belgeler</h3>
        <p className="-mt-2 text-xs text-muted-foreground">
          Bu belgeler sadece admin panelinde görünür, araç detay sayfasında (ziyaretçiye) gösterilmez.
        </p>
        {form.documents.map((doc, index) => (
          <div key={index} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="truncate">
              <strong>{DOCUMENT_TYPE_OPTIONS.find((t) => t.value === doc.type)?.label ?? doc.type}:</strong> {doc.name}
            </span>
            <button type="button" onClick={() => removeDocument(index)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <DocumentAddRow onAdd={addDocument} />
      </section>

      {/* Admin notu */}
      <section className="space-y-1.5 rounded-2xl border border-border p-5">
        <Label htmlFor="v-admin-notes">Admin Notu</Label>
        <p className="-mt-1 text-xs text-muted-foreground">Sadece admin panelinde görünür — müşteriye açık sayfada gösterilmez.</p>
        <Textarea id="v-admin-notes" rows={2} value={form.adminNotes} onChange={(e) => set("adminNotes", e.target.value)} placeholder="Örn: Ahmet Bey aracı görmek istiyor." />
      </section>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate("/admin/araclar")}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-60">
          {isSubmitting ? "Kaydediliyor…" : isEditing ? "Kaydet" : "Araç İlanını Yayınla"}
        </Button>
      </div>
    </form>
  );
}

/** Belgeler bölümü için — tip seç + PDF yükle, yüklenince listeye eklenir. */
function DocumentAddRow({ onAdd }) {
  const [type, setType] = useState(DOCUMENT_TYPE_OPTIONS[0].value);
  const [pending, setPending] = useState(null);

  function handleUploaded(uploaded) {
    if (!uploaded) return;
    onAdd(type, uploaded);
    setPending(null);
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Belge Türü</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue>{DOCUMENT_TYPE_OPTIONS.find((t) => t.value === type)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <PdfUploadField label="" value={pending} onChange={handleUploaded} />
      </div>
    </div>
  );
}
