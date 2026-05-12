import { NavLink } from "react-router-dom";
import { LayoutDashboard, TrendingUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/",                   label: "Cotizaciones",        icon: LayoutDashboard, end: true  },
  { to: "/precios-diarios",    label: "Precios del Día",     icon: TrendingUp,      end: false },
  { to: "/base-conocimiento",  label: "Base de Conocimiento",icon: BookOpen,        end: false },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-slate-900 min-h-screen border-r border-white/5">

      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-white/5 shrink-0">
        <img
          src="/logolam.png"
          alt="LAM Corredores de Seguros"
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-3">
          Módulos
        </p>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "text-slate-400 hover:text-white hover:bg-white/8"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5 shrink-0">
        <p className="text-[10px] text-white/20 text-center tracking-wide">
          LAM Corredores de Seguros · v1.0
        </p>
      </div>
    </aside>
  );
}
