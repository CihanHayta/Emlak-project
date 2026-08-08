import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

const FUEL_OPTIONS = ["Benzin", "Dizel", "LPG", "Elektrik", "Hibrit"];
const TRANSMISSION_OPTIONS = ["Manuel", "Otomatik"];

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
      color: "",
      title: "",
      price: "",
      description: "",
      photoRefs: [],
      videoRefs: [],
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
    color: vehicle.color ?? "",
    title: vehicle.title ?? "",
    // property.model.js'teki price ile aynı desen: hazır biçimlendirilmiş
    // gösterim string'i ("450.000 TL") — sadece rakamları geri çıkar.
    price: parseDigits(vehicle.price ?? ""),
    description: vehicle.description ?? "",
    photoRefs: vehicle.images?.length ? vehicle.images : vehicle.image ? [vehicle.image] : [],
    videoRefs: vehicle.videoUrl ? [vehicle.videoUrl] : [],
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
      color: form.color,
      title: form.title,
      price: form.price ? `${formatThousands(form.price)} TL` : "",
      description: form.description,
      image: form.photoRefs[0] ?? "",
      images: form.photoRefs,
      hasVideo: form.videoRefs.length > 0,
      videoUrl: form.videoRefs[0],
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
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border p-5 sm:grid-cols-3">
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
          <Label htmlFor="v-year">Yıl</Label>
          <Input id="v-year" type="number" min="1950" max="2100" required value={form.year} onChange={(e) => set("year", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-km">KM</Label>
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
        <div className="space-y-1.5 sm:col-span-3">
          <Label>Vites</Label>
          <Select value={form.transmission} onValueChange={(v) => set("transmission", v)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue>{form.transmission}</SelectValue></SelectTrigger>
            <SelectContent>
              {TRANSMISSION_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Medya */}
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
