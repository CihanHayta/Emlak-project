import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, X, Loader2, UploadCloud } from "lucide-react";
import { uploadMediaFile } from "../../lib/mediaStore";
import { cn } from "@/lib/utils";

/**
 * Tek bir PDF dosyası için yükleme alanı — MediaUploadField ile aynı desen
 * (gerçek dosya, backend'e POST, gelen URL kaydedilir) ama tek dosyalık ve
 * PDF'e özel: `uploadMediaFile(file, "document")` çağırır — backend
 * `document` kind'ı SADECE PDF kabul eder (bkz. server/src/config/constants.js
 * UPLOAD_LIMITS.document), tarayıcı `accept` niteliği sadece kozmetik bir
 * ilk filtre.
 *
 * `value`: `{ url, name } | null`. Backend yüklenen dosyanın orijinal adını
 * saklamıyor (storage path'i UUID) — bu yüzden dosya adı tarayıcıda seçilir
 * seçilmez (`file.name`) yakalanıp `onChange`'e birlikte veriliyor.
 */
export default function PdfUploadField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file) {
    if (file.type !== "application/pdf") {
      toast.error("Sadece PDF dosyası yükleyebilirsiniz.");
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadMediaFile(file, "document");
      onChange({ url, name: file.name });
    } catch (error) {
      console.error("PDF yüklenemedi:", error);
      toast.error(error.message || "PDF yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 text-sm text-foreground hover:text-brand-gold-dark"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value.name}</span>
          </a>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Değiştir
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Kaldır"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground transition hover:border-brand-gold hover:text-brand-gold-dark disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {isUploading ? "Yükleniyor…" : "PDF Yükle"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
