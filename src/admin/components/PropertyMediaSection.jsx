import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Plus, X, Loader2, UploadCloud, Star, GripVertical, Video as VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchPropertyMedia,
  setPropertyCoverMedia,
  reorderPropertyMedia,
  deletePropertyMedia,
  uploadPropertyMediaFile,
} from "../data/propertyMediaStore";

/**
 * İlanın fotoğraf/videolarını yönetir — `VehicleMediaSection.jsx` ile AYNI
 * desen (presigned-upload akışı, bkz. propertyMediaStore.js), belgeler/
 * ekspertiz raporu bölümleri YOK (property_media'da bu kavram yok — sadece
 * "image"/"video"). `propertyId` GERÇEK olmalı — ListingForm.jsx yeni bir
 * ilanda taslak kaydı önce oluşturup bu bileşeni ondan sonra render eder
 * (bkz. o dosyanın yorumu).
 */
export default function PropertyMediaSection({ propertyId }) {
  const [media, setMedia] = useState(null); // null = henüz yüklenmedi
  const [uploadingFiles, setUploadingFiles] = useState([]); // [{tempId, name, kind, progress}]

  const refresh = useCallback(async () => {
    try {
      const list = await fetchPropertyMedia(propertyId);
      setMedia(list);
    } catch (error) {
      console.error("Medya listesi alınamadı:", error);
      toast.error("Fotoğraf/video listesi yüklenemedi.");
    }
  }, [propertyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleUpload(files, kind) {
    for (const file of files) {
      const tempId = crypto.randomUUID();
      setUploadingFiles((prev) => [...prev, { tempId, name: file.name, kind, progress: 0 }]);

      // Sıralı yükleme (ilerleme çubukları karışmasın), birkaç dosya için paralelleştirmeye değmez.
      await uploadPropertyMediaFile(propertyId, file, kind, {
        onProgress: (progress) => {
          setUploadingFiles((prev) => prev.map((item) => (item.tempId === tempId ? { ...item, progress } : item)));
        },
      })
        .then(() => refresh())
        .catch((error) => {
          console.error(`Medya yüklenemedi (${file.name}):`, error);
          toast.error(`${file.name}: ${error.message || "Yükleme başarısız oldu."}`);
        })
        .finally(() => {
          setUploadingFiles((prev) => prev.filter((item) => item.tempId !== tempId));
        });
    }
  }

  async function handleDelete(mediaId) {
    try {
      await deletePropertyMedia(propertyId, mediaId);
      await refresh();
    } catch (error) {
      toast.error(error.message || "Silinemedi.");
    }
  }

  async function handleSetCover(mediaId) {
    try {
      await setPropertyCoverMedia(propertyId, mediaId);
      await refresh();
    } catch (error) {
      toast.error(error.message || "Kapak fotoğrafı ayarlanamadı.");
    }
  }

  async function handleReorder(orderedIds) {
    // İyimser güncelleme — sıra hemen ekranda değişsin, backend'e arka planda yazılsın.
    setMedia((prev) => orderedIds.map((id) => prev.find((m) => m.id === id)));
    try {
      await reorderPropertyMedia(propertyId, orderedIds);
    } catch (error) {
      toast.error(error.message || "Sıralama kaydedilemedi.");
      refresh();
    }
  }

  if (media === null) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const photos = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  const uploadingPhotos = uploadingFiles.filter((f) => f.kind === "image");
  const uploadingVideos = uploadingFiles.filter((f) => f.kind === "video");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Fotoğraflar</p>
        <p className="text-xs text-muted-foreground">
          Sürükleyerek sıralayın — listenin ilk fotoğrafı kapak fotoğrafı olarak kullanılır.
        </p>
        <PhotoGrid
          photos={photos}
          uploading={uploadingPhotos}
          onUpload={(files) => handleUpload(files, "image")}
          onDelete={handleDelete}
          onSetCover={handleSetCover}
          onReorder={handleReorder}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Videolar</p>
        <VideoList videos={videos} uploading={uploadingVideos} onUpload={(files) => handleUpload(files, "video")} onDelete={handleDelete} />
      </div>
    </div>
  );
}

function UploadingChip({ item }) {
  return (
    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-center">
      <Loader2 className="h-4 w-4 animate-spin text-brand-gold" />
      <span className="w-full truncate text-[9px] text-muted-foreground">{item.progress}%</span>
    </div>
  );
}

function PhotoGrid({ photos, uploading, onUpload, onDelete, onSetCover, onReorder }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragIndexRef = useRef(null);

  function handleDrop(index) {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === index) return;
    const ids = photos.map((p) => p.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(index, 0, moved);
    onReorder(ids);
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
        if (event.dataTransfer.files?.length) onUpload([...event.dataTransfer.files]);
      }}
    >
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            draggable
            onDragStart={() => {
              dragIndexRef.current = index;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(index);
            }}
            className="group relative h-20 w-20 shrink-0 cursor-grab overflow-hidden rounded-lg bg-muted active:cursor-grabbing"
          >
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
            {photo.isCover && (
              <span className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 bg-brand-gold py-0.5 text-[9px] font-semibold text-white">
                <Star className="h-2.5 w-2.5 fill-white" />
                Kapak
              </span>
            )}
            <GripVertical className="absolute left-1 top-1 h-3.5 w-3.5 text-white drop-shadow opacity-0 transition-opacity group-hover:opacity-70" />
            <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {!photo.isCover && (
                <button
                  type="button"
                  onClick={() => onSetCover(photo.id)}
                  title="Kapak yap"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(photo.id)}
                aria-label="Kaldır"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {uploading.map((item) => (
          <UploadingChip key={item.tempId} item={item} />
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-brand-gold hover:text-brand-gold-dark"
        >
          {isDragOver ? <UploadCloud className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          <span className="text-[10px]">{isDragOver ? "Bırakın" : "Ekle"}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) onUpload([...event.target.files]);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function VideoList({ videos, uploading, onUpload, onDelete }) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-2">
      {videos.map((video) => (
        <div key={video.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
            <VideoIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <video src={video.url} controls className="h-14 max-w-[220px] flex-1 rounded-lg bg-black" />
          <button
            type="button"
            onClick={() => onDelete(video.id)}
            aria-label="Kaldır"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {uploading.map((item) => (
        <div key={item.tempId} className="flex items-center gap-3 rounded-xl border border-border p-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-gold" />
          <span className="flex-1 truncate">{item.name}</span>
          <span className="text-xs">{item.progress}%</span>
        </div>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground transition hover:border-brand-gold hover:text-brand-gold-dark"
      >
        <UploadCloud className="h-4 w-4" />
        Video Ekle
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) onUpload([...event.target.files]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
