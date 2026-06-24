// generar-cotizacion: replica la tool 'apidaniel' del flujo n8n. Genera la
// cotización OFICIAL de salud (PDF) llamando al cotizador externo cotizar.php
// con titular + beneficiarios + planes. El agente la invoca como tool http; el
// cálculo de fecha_nacimiento (desde la edad) y el armado de beneficiarios se
// hacen aquí (server-side), porque la tool http no puede ejecutar JS.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COTIZADOR_URL = "https://mspeed.yoestoyasegurado.co/app/lam/cotizar.php";

// Convención LAM: cumpleaños asumido 15 de junio; deriva el año desde la edad.
function calcularFechaNacimiento(edad: unknown): string {
  const e = parseInt(String(edad));
  if (isNaN(e) || e < 0 || e > 120) return "";
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();
  const MES = 6, DIA = 15;
  const yaCumplio = mesActual > MES || (mesActual === MES && diaActual >= DIA);
  const anioNac = yaCumplio ? anioActual - e : anioActual - e - 1;
  return `15-06-${anioNac}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // deno-lint-ignore no-explicit-any
  const body: any = await req.text().then((t) => (t ? JSON.parse(t) : {})).catch(() => ({}));

  // planes: array de ints o string "156,27,8"
  const planes = Array.isArray(body.planes)
    ? body.planes.map((x: unknown) => parseInt(String(x))).filter((x: number) => !isNaN(x))
    : String(body.planes ?? "")
        .split(",").map((x) => parseInt(x.trim())).filter((x) => !isNaN(x));

  // beneficiarios: array o JSON-string; cada uno trae edad -> fecha_nacimiento
  let beneficiarios: unknown[] = [];
  try {
    const parsed = typeof body.beneficiarios === "string"
      ? JSON.parse(body.beneficiarios || "[]")
      : (body.beneficiarios ?? []);
    if (Array.isArray(parsed)) {
      // deno-lint-ignore no-explicit-any
      beneficiarios = parsed.map((b: any) => ({
        parentesco: b.parentesco ?? "",
        nombres: b.nombres ?? "",
        apellidos: b.apellidos ?? "",
        cedula: b.cedula ?? "",
        fecha_nacimiento: calcularFechaNacimiento(b.edad),
        genero: b.genero ?? "",
        telefono: b.telefono ?? "",
      }));
    }
  } catch { beneficiarios = []; }

  if (planes.length === 0) {
    return new Response(JSON.stringify({ error: "Faltan planes (IDs de plan)" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
  }

  const payload = {
    nombre: body.nombre ?? "",
    apellido: body.apellido ?? "",
    cedula: body.cedula ?? "",
    fecha_nacimiento: calcularFechaNacimiento(body.edad),
    sexo: body.sexo ?? "",
    email: body.email ?? "",
    telefono: String(body.telefono ?? "584120000000"),
    planes,
    id_analista: 16,
    beneficiarios,
  };

  try {
    const r = await fetch(COTIZADOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    return new Response(text, {
      status: r.ok ? 200 : 502,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `cotizador no disponible: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 502, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }
});
