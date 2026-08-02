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
import { getListings, deleteListing, subscribeToListings } from "../data/listingStore";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import ListingThumbnail from "../components/ListingThumbnail";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const PAGE_SIZE = 12;

/** "/admin/ilanlar" — every listing (seeded from the public site + anything created here), searchable/filterable, with edit/delete. */
export default function Listings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState(getListings());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => subscribeToListings(() => setListings(getListings())), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (query && !`${l.title} ${l.listingNo}`.toLowerCase().includes(query)) return false;
      if (categoryFilter !== ALL && l.category !== categoryFilter) return false;
      if (typeFilter !== ALL && l.type !== typeFilter) return false;
      return true;
    });
  }, [listings, search, categoryFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function confirmDelete() {
    try {
      await deleteListing(pendingDelete.id);
      toast.success(`"${pendingDelete.title}" silindi.`);
    } catch (error) {
      toast.error(error.message || "İlan silinemedi.");
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
              placeholder="Başlık veya ilan no ara..."
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
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue>{typeFilter === ALL ? "Tüm Tipler" : typeFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm Tipler</SelectItem>
              <SelectItem value="Daire">Daire</SelectItem>
              <SelectItem value="Müstakil">Müstakil</SelectItem>
              <SelectItem value="Arsa">Arsa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => navigate("/admin/ilanlar/yeni")} className="bg-brand-gold text-white hover:bg-brand-gold-dark">
          <Plus className="h-4 w-4" />
          Yeni İlan Ekle
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} ilan bulundu.</p>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">İlan</th>
              <th className="px-4 py-3">Tip</th>
              <th className="px-4 py-3">Konum</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Bu kritere uygun ilan bulunamadı.</td>
              </tr>
            )}
            {pageItems.map((listing) => (
              <tr key={listing.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/ilanlar/${listing.id}`)}
                      title="İlan detayına git"
                      className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted"
                    >
                      <ListingThumbnail src={listing.image} alt={listing.title} className="h-full w-full object-cover" />
                      {listing.hasVideo && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 p-0.5">
                          <Video className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">
                        #{listing.listingNo} ·{" "}
                        <span className={cn(listing.category === "satilik" ? "text-brand-gold-dark" : "text-emerald-600")}>
                          {listing.category === "satilik" ? "Satılık" : "Kiralık"}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{listing.type}</td>
                <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">
                  {[listing.neighborhood, listing.district].filter(Boolean).join(", ")}
                </td>
                <td className="px-4 py-3 font-semibold text-brand-gold-dark">{listing.price}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/ilanlar/${listing.id}`)}
                      title="Düzenle"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(listing)}
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
        title="İlanı sil"
        description={pendingDelete ? `"${pendingDelete.title}" ilanını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.` : ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
