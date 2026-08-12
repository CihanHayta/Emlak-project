import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Loader2, UploadCloud } from "lucide-react";
import { uploadMediaFile } from "../../lib/mediaStore";
import { useResolvedMediaUrl } from "../../lib/useResolvedMediaUrl";
import { cn } from "@/lib/utils";

/**
 * Multi-file upload field for a listing's photos or videos — actual files
 * (dragged/picked from disk), not a URL text box. Each selected file is
 * uploaded to the backend (see lib/mediaStore.js's uploadMediaFile) and
 * `value` holds the real URL it returns; existing plain-URL entries (the
 * public site's sample photos) display exactly the same way.
 *
 * Bulk-friendly by design: the file input already accepts multiple files
 * per pick (ctrl/shift-click in the OS dialog), and the whole dropzone also
 * accepts dragging a batch of files/folders in from Finder/Explorer at once
 * — no need to add them one at a time.
 */
export default function MediaUploadField({ label, accept, isVideo = false, value, onChange }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  async function handleFiles(fileList) {
    const files = [...fileList];
    const kind = isVideo ? "video" : "image";
    setUploadingCount((count) => count + files.length);
    // Promise.all DEĞİL Promise.allSettled: birden fazla dosya seçilince
    // (asıl kullanım şekli — bkz. dosya input'undaki multiple), Promise.all
    // paketteki TEK bir dosya reddedilince (ör. 10MB sınırını aşan bir
    // fotoğraf) hepsini reddediyordu — o ana kadar sunucuya BAŞARIYLA
    // yüklenmiş diğer dosyalar bile onChange'e hiç ulaşmıyor, kullanıcı
    // "hiçbir resim yüklenmiyor" sanıyordu (canlıda 2026-08-13'te
    // yakalandı). Her dosya bağımsız değerlendirilmeli: başarılı olanlar
    // eklenir, başarısız olanlar hangi dosyanın neden başarısız olduğunu
    // gösteren ayrı bir toast'la bildirilir.
    const results = await Promise.allSettled(files.map((file) => uploadMediaFile(file, kind)));
    const newUrls = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
    if (newUrls.length) onChange([...value, ...newUrls]);

    results.forEach((result, index) => {
      if (result.status !== "rejected") return;
      const fileName = files[index].name;
      console.error(`Medya dosyası yüklenemedi (${fileName}):`, result.reason);
      toast.error(`${fileName}: ${result.reason.message || "Dosya yüklenemedi. Lütfen tekrar deneyin."}`);
    });

    setUploadingCount((count) => count - files.length);
  }

  function handleRemove(index) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl p-2 transition-colors",
        isDragOver && "bg-brand-gold/5 outline-dashed outline-2 outline-brand-gold",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        if (event.dataTransfer.files?.length) handleFiles(event.dataTransfer.files);
      }}
    >
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {value.map((ref, index) => (
          <MediaThumb key={`${ref}-${index}`} mediaRef={ref} isVideo={isVideo} onRemove={() => handleRemove(index)} />
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadingCount > 0}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-brand-gold hover:text-brand-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadingCount > 0 ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isDragOver ? (
            <UploadCloud className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          <span className="text-[10px]">{uploadingCount > 0 ? "Yükleniyor..." : isDragOver ? "Bırakın" : "Ekle"}</span>
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Birden fazla dosyayı aynı anda seçebilir veya buraya sürükleyip bırakabilirsiniz.
        {isVideo && " Videolar sunucuya yüklendiği için büyük dosyalarda birkaç saniye sürebilir."}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) handleFiles(event.target.files);
          event.target.value = ""; // lets the same file be picked again later
        }}
      />
    </div>
  );
}

function MediaThumb({ mediaRef, isVideo, onRemove }) {
  const url = useResolvedMediaUrl(mediaRef);

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
      {!url ? (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : isVideo ? (
        <video src={url} className="h-full w-full object-cover" muted playsInline />
      ) : (
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Kaldır"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
