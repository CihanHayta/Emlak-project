import { ArrowUp, ArrowDown, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
import { cn } from "@/lib/utils";

export const PHOTO_CATEGORY_OPTIONS = [
  "Ön", "Arka", "Sağ Taraf", "Sol Taraf", "İç Mekan", "Gösterge Paneli",
  "Motor", "Bagaj", "Lastikler", "Hasarlı Bölge", "Diğer",
];

/**
 * MediaUploadField (yükleme/silme) DEĞİŞTİRİLMEDEN, onun altında ayrı bir
 * "düzenle" listesi — sıralama (yukarı/aşağı, ilk fotoğraf otomatik kapak
 * olduğu için sıralama = kapak seçimi de sağlıyor) ve her fotoğrafa bir
 * kategori etiketi. Kategoriler `images` dizisinin KENDİSİNİ değiştirmez
 * (o hâlâ düz bir URL listesi — PropertyGallery/VehicleCard'ın beklediği
 * format, geriye uyumluluk bozulmasın diye) — ayrı bir `{url: kategori}`
 * haritasında (`categories`) tutulur.
 */
export default function PhotoManagerList({ photoRefs, categories, onReorder, onCategoryChange }) {
  if (photoRefs.length === 0) return null;

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= photoRefs.length) return;
    const next = [...photoRefs];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Sırayı ve kategorileri düzenleyin — listenin ilk fotoğrafı kapak fotoğrafı olarak kullanılır.
      </p>
      <div className="space-y-2">
        {photoRefs.map((ref, index) => (
          <PhotoRow
            key={`${ref}-${index}`}
            mediaRef={ref}
            index={index}
            isCover={index === 0}
            isLast={index === photoRefs.length - 1}
            category={categories[ref] ?? ""}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            onCategoryChange={(value) => onCategoryChange(ref, value)}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoRow({ mediaRef, index, isCover, isLast, category, onMoveUp, onMoveDown, onCategoryChange }) {
  const url = useResolvedMediaUrl(mediaRef);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-2">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        <img src={url ?? ""} alt="" className="h-full w-full object-cover" />
        {isCover && (
          <span className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 bg-brand-gold py-0.5 text-[9px] font-semibold text-white">
            <Star className="h-2.5 w-2.5 fill-white" />
            Kapak
          </span>
        )}
      </div>

      <Select value={category || undefined} onValueChange={onCategoryChange}>
        <SelectTrigger className="h-8 flex-1 text-xs">
          <SelectValue placeholder="Kategori seç">{category || undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PHOTO_CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          title="Yukarı taşı (kapağa yaklaştır)"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted",
            index === 0 && "cursor-not-allowed opacity-30",
          )}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          title="Aşağı taşı"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted",
            isLast && "cursor-not-allowed opacity-30",
          )}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
