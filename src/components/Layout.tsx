import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sidebar, NAV_ITEMS } from "./Sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Cotizaciones",
  "/precios-diarios": "Precios del Día",
  "/base-conocimiento": "Base de Conocimiento",
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? "LAM";

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-r border-white/5 flex flex-col">
          <div className="flex items-center px-5 h-16 border-b border-white/5 shrink-0">
            <img src="/logolam.png" alt="LAM Corredores de Seguros" className="h-10 w-auto object-contain" />
          </div>
          <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-3">
              Módulos
            </p>
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-white shadow-sm shadow-primary/30"
                      : "text-slate-400 hover:text-white hover:bg-white/8"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-500")} />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="px-5 py-4 border-t border-white/5 shrink-0">
            <p className="text-[10px] text-white/20 text-center tracking-wide">
              LAM Corredores de Seguros · v1.0
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar */}
          <header className="md:hidden flex items-center h-14 px-4 border-b bg-slate-900 shrink-0 gap-3 sticky top-0 z-20">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 shrink-0"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-white font-semibold text-sm flex-1 truncate">{title}</span>
            <img src="/logolam.png" alt="LAM" className="h-7 w-auto object-contain" />
          </header>

          {children}
        </div>
      </div>
    </>
  );
}
