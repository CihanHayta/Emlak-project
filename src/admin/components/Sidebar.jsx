import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Car,
  FileText,
  CalendarDays,
  Users,
  MessageSquare,
  Bell,
  Settings,
  Megaphone,
  Plus,
  Home as HomeIcon,
  ChevronLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSession } from "../lib/auth";
import { getLeads, subscribeToLeads } from "../../lib/leadStore";
import { getCustomers, subscribeToCustomers } from "../data/customerStore";
import { getConversations, subscribeToConversations } from "../data/conversationStore";
import { getLastSeen, subscribeToLastSeen } from "../lib/lastSeen";
import { toMillis } from "../../lib/firestoreTimestamp";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "İlanlar", to: "/admin/ilanlar", icon: Building2 },
  { label: "Araçlar", to: "/admin/araclar", icon: Car },
  { label: "Başvurular", to: "/admin/basvurular", icon: FileText, badgeKey: "newLeads" },
  { label: "Randevular", to: "/admin/randevular", icon: CalendarDays },
  { label: "Müşteriler", to: "/admin/musteriler", icon: Users, badgeKey: "newCustomers" },
  { label: "Mesajlar", to: "/admin/mesajlar", icon: MessageSquare, badgeKey: "unreadMessages" },
  { label: "Bildirimler", to: "/admin/bildirimler", icon: Bell },
  // Kampanya sayfası oluşturma/yayınlama — Ayarlar'la aynı gerekçeyle
  // sadece owner'da (bkz. server/authorize.middleware.js'in "funnels:*"ı
  // agent/assistant'a hiç vermemesi).
  { label: "Funnel", to: "/admin/funnel", icon: Megaphone, ownerOnly: true },
  // Sadece admin (owner) görür — Danışman/Personel için Ayarlar sayfası
  // (kullanıcı yönetimi) hiç anlamlı değil, bkz. Settings.jsx'in kendi
  // rol koruması.
  { label: "Ayarlar", to: "/admin/ayarlar", icon: Settings, ownerOnly: true },
];

/**
 * Left-hand navigation for the admin panel. Collapsible (icon-only) for
 * more working room on smaller screens — state is local, no need to persist.
 */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [leads, setLeads] = useState(getLeads());
  const [customers, setCustomers] = useState(getCustomers());
  const [conversations, setConversations] = useState(getConversations());
  // Değeri hiç okunmuyor — sadece setLastSeenTick'i "sayfa görüldü"
  // olayında çağırıp yeniden render tetiklemek için var (bkz. lib/lastSeen.js).
  const [, setLastSeenTick] = useState(0);
  const navigate = useNavigate();
  const isOwner = getSession()?.role === "owner";
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  useEffect(() => {
    const unsubLeads = subscribeToLeads(() => setLeads(getLeads()));
    const unsubCustomers = subscribeToCustomers(() => setCustomers(getCustomers()));
    const unsubConversations = subscribeToConversations(() => setConversations(getConversations()));
    const unsubLastSeen = subscribeToLastSeen(() => setLastSeenTick((n) => n + 1));
    return () => {
      unsubLeads();
      unsubCustomers();
      unsubConversations();
      unsubLastSeen();
    };
  }, []);

  // Başvurular/Müşteriler rozetleri "Yeni" durumunu DEĞİL, ilgili sayfa en
  // son ne zaman ziyaret edildiğini baz alır (bkz. lib/lastSeen.js) — sayfa
  // açılınca rozet sıfırlanır, sadece ondan SONRA gelen "Yeni" kayıtlar
  // sayılır. Mesajlar rozeti ise zaten sohbet bazlı okunmadı sayacının
  // toplamı (conversation.unreadCount, her sohbet açılınca kendiliğinden
  // sıfırlanıyor — bkz. Mesajlar.jsx#markConversationRead).
  const badgeCounts = {
    newLeads: leads.filter((l) => l.status === "Yeni" && toMillis(l.createdAt) > getLastSeen("basvurular")).length,
    newCustomers: customers.filter((c) => c.status === "Yeni" && toMillis(c.createdAt) > getLastSeen("musteriler")).length,
    unreadMessages: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
  };

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-white/6 bg-zinc-950 transition-all duration-200",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/6 px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-brand-gold text-brand-gold">
          <HomeIcon className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="truncate text-base font-extrabold tracking-wide text-white">ŞAHİN EMLAK</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map(({ label, to, icon: Icon, end, badgeKey }) => {
          const badgeCount = badgeKey ? badgeCounts[badgeKey] : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  "before:absolute before:inset-y-1.5 before:-left-3 before:w-0.5 before:rounded-full before:bg-brand-gold before:transition-opacity",
                  isActive
                    ? "bg-white/6 text-white before:opacity-100"
                    : "text-zinc-400 before:opacity-0 hover:bg-white/4 hover:text-zinc-200",
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {badgeCount > 0 && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-gold px-1 text-[11px] font-semibold text-white",
                    collapsed && "absolute right-1 top-1 h-4 min-w-4 text-[9px]",
                  )}
                >
                  {badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick action + collapse toggle */}
      <div className="space-y-2 border-t border-white/6 p-3">
        <NewListingButton collapsed={collapsed} onClick={() => navigate("/admin/ilanlar/yeni")} />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-white/4 hover:text-zinc-300"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Daralt"}
        </button>
      </div>
    </aside>
  );
}

function NewListingButton({ collapsed, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-gold/50 px-3 py-2.5 text-sm font-semibold text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold/10",
      )}
    >
      <Plus className="h-4 w-4 shrink-0" />
      {!collapsed && "Yeni İlan Ekle"}
    </button>
  );
}
