"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Barra de progreso superior. Aparece AL INSTANTE cuando se hace clic en un
// enlace interno hacia otra ruta (para que el clic se sienta registrado aunque
// la página tarde en cargar), y se oculta cuando la navegación termina (cambia
// el pathname). Sin librerías: escucha clics en <a> y cambios de ruta.
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Navegación completada → ocultar.
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Clic en un enlace interno a otra ruta → mostrar de inmediato.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      try {
        const dest = new URL(href, window.location.href);
        if (dest.pathname === window.location.pathname && dest.search === window.location.search) return;
        setLoading(true);
      } catch {
        /* href inválido: ignorar */
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Salvaguarda: si por algo no se ocultó, quitar a los 12s.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 12000);
    return () => clearTimeout(t);
  }, [loading]);

  if (!loading) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-brand/15"
    >
      <span className="nav-progress-bar" />
    </div>
  );
}
