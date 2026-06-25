import Image from "next/image";

export const dynamic = "force-dynamic";

// Página pública (sin login) que recibe el cliente por WhatsApp. Envuelve el PDF
// del cotizador en un enlace propio, con marca Seguros LAM + el nombre del
// cliente, para que se vea confiable. El slug es <nombre-kebab>-<id_cotizacion>.
const COTIZADOR_FILES = "https://mspeed.yoestoyasegurado.co/app/lam/files";

function parseSlug(slug: string): { id: string | null; name: string } {
  const m = decodeURIComponent(slug).match(/^(.*?)-?(\d+)$/);
  const id = m?.[2] ?? null;
  const rawName = (m?.[1] ?? "").replace(/-/g, " ").trim();
  const name = rawName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { id, name };
}

export default function CotizacionPage({ params }: { params: { slug: string } }) {
  const { id, name } = parseSlug(params.slug);
  const pdfUrl = id ? `${COTIZADOR_FILES}/${id}.pdf` : null;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        {/* Encabezado con marca */}
        <header className="mb-6 flex items-center gap-3">
          <Image src="/logolam.png" alt="Seguros LAM" width={44} height={44} className="rounded-lg" priority />
          <div>
            <p className="text-sm font-semibold text-neutral-900">Seguros LAM</p>
            <p className="text-xs text-neutral-500">Cotización de seguros</p>
          </div>
        </header>

        {/* Tarjeta principal */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">Cotización oficial</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            {name ? `Cotización de ${name}` : "Tu cotización"}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Aquí está tu cotización formal de Seguros LAM. Puedes verla en línea o descargarla en PDF.
          </p>

          {pdfUrl ? (
            <>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  📄 Ver / Descargar tu cotización (PDF)
                </a>
              </div>

              {/* Vista previa embebida */}
              <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                <iframe
                  src={pdfUrl}
                  title="Cotización Seguros LAM"
                  className="h-[70vh] w-full"
                />
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No pudimos ubicar esta cotización. Escríbenos para reenviártela.
            </div>
          )}
        </section>

        <footer className="mt-6 text-center text-xs text-neutral-400">
          Seguros LAM · Esta cotización es referencial y está sujeta a las condiciones de cada aseguradora.
        </footer>
      </div>
    </main>
  );
}
