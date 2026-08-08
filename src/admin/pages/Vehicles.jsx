import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVehicles, deleteVehicle, subscribeToVehicles } from "../data/vehicleStore";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import ListingThumbnail from "../components/ListingThumbnail";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const PAGE_SIZE = 12;

/** "/admin/araclar" — Listings.jsx ile aynı desen, araç alanlarına (marka/model/yıl/km) göre uyarlanmış. */
export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState(getVehicles());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => subscribeToVehicles(() => setVehicles(getVehicles())), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (query && !`${v.title} ${v.brand} ${v.model} ${v.listingNo}`.toLowerCase().includes(query)) return false;
      if (categoryFilter !== ALL && v.category !== categoryFilter) return false;
      return true;
    });
  }, [vehicles, search, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function confirmDelete() {
    try {
      await deleteVehicle(pendingDelete.id);
      toast.success(`"${pendingDelete.title}" silindi.`);
    } catch (error) {
      toast.error(error.message || "Araç silinemedi.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Başlık, marka, model veya ilan no ara..."
              className="pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue>{categoryFilter === ALL ? "Tümü" : categoryFilter === "satilik" ? "Satılık" : "Kiralık"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tümü</SelectItem>
              <SelectItem value="satilik">Satılık</SelectItem>
              <SelectItem value="kiralik">Kiralık</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => navigate("/admin/araclar/yeni")} className="bg-brand-gold text-white hover:bg-brand-gold-dark">
          <Plus className="h-4 w-4" />
          Yeni Araç Ekle
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} araç bulundu.</p>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Araç</th>
              <th className="px-4 py-3">Yıl</th>
              <th className="px-4 py-3">KM</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Bu kritere uygun araç bulunamadı.</td>
              </tr>
            )}
            {pageItems.map((vehicle) => (
              <tr key={vehicle.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/araclar/${vehicle.id}`)}
                      title="Araç detayına git"
                      className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted"
                    >
                      <ListingThumbnail src={vehicle.image} alt={vehicle.title} className="h-full w-full object-cover" />
                      {vehicle.hasVideo && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 p-0.5">
                          <Video className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{vehicle.title}</p>
                      <p className="text-xs text-muted-foreground">
                        #{vehicle.listingNo} · {vehicle.brand} {vehicle.model} ·{" "}
                        <span className={cn(vehicle.category === "satilik" ? "text-brand-gold-dark" : "text-emerald-600")}>
                          {vehicle.category === "satilik" ? "Satılık" : "Kiralık"}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{vehicle.year}</td>
                <td className="px-4 py-3 text-muted-foreground">{Number(vehicle.km).toLocaleString("tr-TR")} km</td>
                <td className="px-4 py-3 font-semibold text-brand-gold-dark">{vehicle.price}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/araclar/${vehicle.id}`)}
                      title="Düzenle"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(vehicle)}
                      title="Sil"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Önceki</Button>
          <span className="text-sm text-muted-foreground">Sayfa {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
        </div>
      )}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Aracı sil"
        description={pendingDelete ? `"${pendingDelete.title}" aracını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.` : ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
