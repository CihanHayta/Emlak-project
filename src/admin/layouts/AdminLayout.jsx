import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CommandPalette from "../components/CommandPalette";
import { useUpcomingAppointmentReminders } from "../lib/useUpcomingAppointmentReminders";
import { useIncomingLeadAlerts } from "../lib/useIncomingLeadAlerts";
import { useIncomingMessageAlerts } from "../lib/useIncomingMessageAlerts";
import { useStaleFollowUpAlerts } from "../lib/useStaleFollowUpAlerts";

// Longest-prefix match from pathname -> page title/subtitle, so the Topbar
// always shows something sensible even for nested routes (e.g. an ilan's
// edit page still says "İlanlar").
const PAGE_TITLES = [
  { prefix: "/admin/ilanlar/yeni", title: "Yeni İlan", subtitle: "Yeni bir ilan oluşturun." },
  { prefix: "/admin/ilanlar", title: "İlanlar", subtitle: "Tüm ilanlarınızı buradan yönetebilirsiniz." },
  { prefix: "/admin/basvurular", title: "Başvurular", subtitle: "Gelen başvuruları inceleyin." },
  { prefix: "/admin/randevular", title: "Randevular", subtitle: "Tüm randevularınızı buradan yönetebilirsiniz." },
  { prefix: "/admin/musteriler", title: "Müşteriler", subtitle: "Müşteri kartlarını ve gelen formları yönetin." },
  { prefix: "/admin/mesajlar", title: "Mesajlar", subtitle: "Müşterilerle olan yazışmalarınız." },
  { prefix: "/admin/bildirimler", title: "Bildirimler", subtitle: "Tüm bildirimleriniz." },
  { prefix: "/admin/otomasyonlar", title: "Otomasyonlar", subtitle: "Proaktif WhatsApp mesajları ve mesai dışı otomatik yanıt." },
  { prefix: "/admin/ayarlar", title: "Ayarlar", subtitle: "Kullanıcılar ve yetkiler." },
  { prefix: "/admin", title: "Dashboard", subtitle: "Genel bakış." },
];

function resolveTitle(pathname) {
  const match = PAGE_TITLES.find(({ prefix }) => pathname.startsWith(prefix));
  return match ?? { title: "Admin", subtitle: "" };
}

/**
 * Shell for every route under /admin (once past RequireAuth): sidebar +
 * topbar + the page content via <Outlet/>, plus the panel-wide utilities
 * that need to be mounted exactly once — dark/light theme, toast
 * notifications, the ⌘K command palette, and the "2 saat önce hatırlat"
 * appointment reminder watcher.
 */
export default function AdminLayout() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const { title, subtitle } = resolveTitle(location.pathname);

  useUpcomingAppointmentReminders();
  useIncomingLeadAlerts();
  useIncomingMessageAlerts();
  useStaleFollowUpAlerts();

  // `h-dvh` + `min-h-0` kutuyu ekran yüksekliğine sabitliyor ama html/body'nin
  // KENDİSİ hâlâ kayabiliyordu (hiçbir yerde `overflow: hidden` yoktu) — bu
  // yüzden trackpad/mouse scroll'u `main`in kendi `overflow-y-auto`'sunda
  // durmayıp DIŞARI, belgeye taşabiliyor, bu da sidebar dahil TÜM flex
  // düzenini yukarı kaydırıyordu (canlıda 2026-08-13'te, min-h-0 + h-dvh
  // fix'lerinden SONRA da devam ettiği bildirildi). Admin panelindeyken
  // body'yi tamamen kilitlemek, kaydırmanın SADECE tasarlanan iç
  // container'larda (main, sidebar nav) kalmasını garantiliyor — dışarı asla
  // taşamıyor. Sadece admin route'larında (public site sayfaları normal
  // belge kaydırmasına ihtiyaç duyuyor) — bu yüzden global CSS'e değil,
  // burada mount/unmount'a bağlı.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <div className="flex h-dvh min-h-0 bg-background">
          <Sidebar />
          {/* `min-h-0` BURADA ŞART — flex öğelerinin varsayılan `min-height:
              auto` davranışı, uzun bir sayfa (ör. çok alanlı bir ilan formu)
              içeriğine göre bu kutuyu ekran yüksekliğinin ÜZERİNE
              büyütüyordu; bu da tüm SAYFAYI (sidebar dahil) kaydırılabilir
              yapıp, sidebar'ın gerçek sınırının altında boş/beyaz bir alan
              görünmesine sebep oluyordu — sadece `main` kaymalıydı, sidebar
              hep sabit kalmalıydı. `min-h-0`, bu kutuyu ebeveyninin
              sınırına gerçekten uymaya zorluyor, böylece `main`in kendi
              `overflow-y-auto`'su devreye giriyor, dış sayfa hiç kaymıyor.
              `h-dvh` (100vh DEĞİL) — mobil Safari'de `100vh` adres çubuğu
              gizliyken en büyük olası görünür alanı esas alıyor; adres
              çubuğu görünürken gerçek alan daha küçük oluyor ve h-screen'in
              alt kısmı ekranın dışına taşıp aynı "kaydırınca boşluk çıkıyor"
              belirtisini tek başına da üretebiliyordu (canlıda 2026-08-13'te
              yakalandı — min-h-0 fix'i yeterli gelmemişti). `dvh` (dynamic
              viewport height) tarayıcı UI'ı açılıp kapandıkça güncelleniyor. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Topbar title={title} subtitle={subtitle} onOpenSearch={() => setSearchOpen(true)} />
            <main className="min-h-0 flex-1 overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>

        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        {/* bottom-right, not top-right: top-right would sit directly over
            the topbar's search/bell/avatar controls and block clicks on them. */}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
