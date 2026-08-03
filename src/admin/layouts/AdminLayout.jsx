import { useState } from "react";
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

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar title={title} subtitle={subtitle} onOpenSearch={() => setSearchOpen(true)} />
            <main className="flex-1 overflow-y-auto p-6">
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
