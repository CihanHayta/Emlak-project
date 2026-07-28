import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CalendarDays,
  Users,
  MessageSquare,
  Bell,
  Settings,
  Plus,
  Home as HomeIcon,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "İlanlar", to: "/admin/ilanlar", icon: Building2 },
  { label: "Başvurular", to: "/admin/basvurular", icon: FileText },
  { label: "Randevular", to: "/admin/randevular", icon: CalendarDays },
  { label: "Müşteriler", to: "/admin/musteriler", icon: Users },
  { label: "Mesajlar", to: "/admin/mesajlar", icon: MessageSquare },
  { label: "Bildirimler", to: "/admin/bildirimler", icon: Bell },
  { label: "Ayarlar", to: "/admin/ayarlar", icon: Settings },
];

/**
 * Left-hand navigation for the admin panel. Collapsible (icon-only) for
 * more working room on smaller screens — state is local, no need to persist.
 */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-white/10 bg-brand-navy transition-all duration-200",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-brand-gold text-brand-gold">
          <HomeIcon className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="truncate text-base font-extrabold tracking-wide text-white">ŞAHİN EMLAK</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Quick action + collapse toggle */}
      <div className="space-y-2 border-t border-white/10 p-3">
        <NewListingButton collapsed={collapsed} onClick={() => navigate("/admin/ilanlar/yeni")} />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-white/5 hover:text-gray-300"
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
