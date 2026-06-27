// _shared/kommo.ts
// Helpers reutilizables para interactuar con la API de Kommo CRM.
// Copiados verbatim de publish-to-kommo/index.ts para evitar duplicación.
//
// Uso:
//   import { patchLeadField, runSalesbot } from "../_shared/kommo.ts";

/**
 * Sanea texto antes de escribirlo en un custom field de Kommo.
 *
 * El almacenamiento de custom fields de Kommo es utf8mb3 (el "utf8" de 3 bytes
 * de MySQL): cualquier carácter de 4 bytes —emojis y demás del plano astral,
 * code point > U+FFFF— TRUNCA el valor; se pierde TODO lo que sigue al primer
 * emoji. Verificado contra la API real: "PARTE_A😀PARTE_B" se guarda como
 * "PARTE_A". Saltos de línea y acentos (≤3 bytes) se conservan perfecto y la
 * longitud no es problema (≥648 chars OK), así que solo removemos los chars de
 * 4 bytes y limpiamos los espacios dobles que deja el emoji quitado (sin tocar
 * los saltos de línea, que el campo es textarea).
 */
export function sanitizeForKommoField(text: string): string {
  return text
    .replace(/[\u{10000}-\u{10FFFF}]/gu, "") // emojis/4-byte → evita el truncado utf8mb3
    .replace(/[ \t]{2,}/g, " ") // colapsa espacios que deja el emoji removido (preserva \n)
    .replace(/[ \t]+\n/g, "\n") // recorta espacios al final de cada línea
    .trim();
}

/**
 * Actualiza un custom field de un lead en Kommo.
 * Throws si la respuesta no es OK.
 */
export async function patchLeadField(
  kommoLeadId: number,
  fieldId: number,
  value: string,
  kommoDomain: string,
  kommoToken: string
): Promise<void> {
  const url = `https://${kommoDomain}/api/v4/leads/${kommoLeadId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${kommoToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      custom_fields_values: [
        {
          field_id: fieldId,
          values: [{ value: sanitizeForKommoField(value) }],
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`patch lead: ${res.status} ${await res.text()}`);
  }
}

/**
 * Actualiza un custom field de un CONTACTO en Kommo (mismo shape que el lead,
 * pero el endpoint apunta a /contacts/). Throws si la respuesta no es OK.
 */
export async function patchContactField(
  kommoContactId: number,
  fieldId: number,
  value: string,
  kommoDomain: string,
  kommoToken: string
): Promise<void> {
  const url = `https://${kommoDomain}/api/v4/contacts/${kommoContactId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${kommoToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      custom_fields_values: [
        {
          field_id: fieldId,
          values: [{ value }],
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`patch contact: ${res.status} ${await res.text()}`);
  }
}

/**
 * Snapshot de los datos de IDENTIDAD de un contacto de Kommo: el nombre estándar
 * (top-level `name`) y los campos multitext estándar Email/Teléfono (resueltos
 * por `field_code` EMAIL/PHONE, que existen en toda cuenta de Kommo). Devuelve el
 * PRIMER valor de cada uno (o null si está vacío). Se usa para "completar solo si
 * está vacío": NUNCA pisar un dato que el lead ya tiene cargado. Throws si !OK.
 */
export type KommoContactSnapshot = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

export async function fetchContactSnapshot(
  kommoContactId: number,
  kommoDomain: string,
  kommoToken: string
): Promise<KommoContactSnapshot> {
  const url = `https://${kommoDomain}/api/v4/contacts/${kommoContactId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${kommoToken}` },
  });
  if (!res.ok) {
    throw new Error(`fetch contact: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    name?: string | null;
    custom_fields_values?: Array<{
      field_code?: string | null;
      values?: Array<{ value?: unknown }>;
    }> | null;
  };
  let email: string | null = null;
  let phone: string | null = null;
  for (const f of json.custom_fields_values ?? []) {
    const code = (f.field_code ?? "").toUpperCase();
    const v = f.values?.[0]?.value;
    const val = v == null || v === "" ? null : String(v);
    if (code === "EMAIL" && val) email = val;
    if (code === "PHONE" && val) phone = val;
  }
  const name = json.name == null || json.name === "" ? null : String(json.name);
  return { name, email, phone };
}

/**
 * Resuelve el `enum_code` a usar al ESCRIBIR un valor nuevo en los campos
 * multitext estándar Email/Teléfono del contacto (Kommo exige un enum: WORK,
 * MOBILE, etc.). Lee las definiciones de custom fields y toma el primer enum de
 * cada campo (por `field_code` EMAIL/PHONE). Fallback "WORK" (presente por
 * defecto en ambos campos en toda cuenta de Kommo). 204 = sin campos.
 */
export async function fetchContactEnumCodes(
  kommoDomain: string,
  kommoToken: string
): Promise<{ email: string; phone: string }> {
  const url = `https://${kommoDomain}/api/v4/contacts/custom_fields?limit=250`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${kommoToken}` },
  });
  if (res.status === 204) return { email: "WORK", phone: "WORK" };
  if (!res.ok) {
    throw new Error(`fetch contact fields: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    _embedded?: {
      custom_fields?: Array<{
        code?: string | null;
        enums?: Array<{ enum?: string | null }> | null;
      }>;
    };
  };
  let email = "WORK";
  let phone = "WORK";
  for (const f of json._embedded?.custom_fields ?? []) {
    const code = (f.code ?? "").toUpperCase();
    const firstEnum = f.enums?.[0]?.enum ?? null;
    if (code === "EMAIL" && firstEnum) email = firstEnum;
    if (code === "PHONE" && firstEnum) phone = firstEnum;
  }
  return { email, phone };
}

/**
 * PATCH genérico a un contacto de Kommo con un body arbitrario (nombre top-level
 * y/o custom_fields_values). Sanea cualquier `value` de string (utf8mb3). Se usa
 * para completar nombre/email/teléfono en una sola llamada. Throws si !OK.
 */
export async function patchContactRaw(
  kommoContactId: number,
  body: Record<string, unknown>,
  kommoDomain: string,
  kommoToken: string
): Promise<void> {
  const url = `https://${kommoDomain}/api/v4/contacts/${kommoContactId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${kommoToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`patch contact: ${res.status} ${await res.text()}`);
  }
}

/**
 * Actualiza el CONTENIDO de una plantilla de chat de Kommo
 * (PATCH /api/v4/chats/templates con [{id, content}]). El flujo legacy de n8n
 * escribe la respuesta del agente en una plantilla y luego corre un salesbot
 * que la envía. Throws si la respuesta no es OK.
 */
export async function patchChatTemplate(
  templateId: number,
  content: string,
  kommoDomain: string,
  kommoToken: string
): Promise<void> {
  const url = `https://${kommoDomain}/api/v4/chats/templates`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${kommoToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ id: templateId, content }]),
  });
  if (!res.ok) {
    throw new Error(`patch chat template: ${res.status} ${await res.text()}`);
  }
}

/**
 * Mueve un lead a otra etapa (status_id) de Kommo, opcionalmente cambiando de
 * pipeline. Throws si la respuesta no es OK.
 */
export async function moveLeadStage(
  kommoLeadId: number,
  statusId: number,
  pipelineId: number | null,
  kommoDomain: string,
  kommoToken: string
): Promise<void> {
  const body: Record<string, unknown> = { status_id: statusId };
  if (pipelineId != null) body.pipeline_id = pipelineId;
  const url = `https://${kommoDomain}/api/v4/leads/${kommoLeadId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${kommoToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`move lead stage: ${res.status} ${await res.text()}`);
  }
}

// Status IDs reservados/universales de Kommo: 142 = GANADO (won), 143 = PERDIDO
// (lost). Existen en TODOS los pipelines. Un lead en cualquiera de estas etapas
// es terminal y nunca debe recibir seguimiento.
export const KOMMO_WON_STATUS = 142;
export const KOMMO_LOST_STATUS = 143;

/**
 * Trae el snapshot EN VIVO de un lead desde Kommo: etapa (status_id +
 * pipeline_id) y responsable asignado (responsible_user_id). Fuente de verdad
 * autoritativa — a diferencia del cache local `kommo_stage_id`, que solo se
 * refresca con inbounds y movimientos del agente. Throws si !OK.
 */
export async function fetchLeadStage(
  kommoLeadId: number,
  kommoDomain: string,
  kommoToken: string
): Promise<{ statusId: number; pipelineId: number; responsibleUserId: number | null }> {
  const url = `https://${kommoDomain}/api/v4/leads/${kommoLeadId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${kommoToken}` },
  });
  if (!res.ok) {
    throw new Error(`fetch lead stage: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    status_id?: number;
    pipeline_id?: number;
    responsible_user_id?: number;
  };
  const ruid = json.responsible_user_id;
  return {
    statusId: Number(json.status_id),
    pipelineId: Number(json.pipeline_id),
    responsibleUserId: ruid == null ? null : Number(ruid),
  };
}

export type KommoStageLite = {
  id: number;
  name: string;
  pipelineId: number;
  pipelineName: string;
};

/**
 * Trae TODAS las etapas (status) de todos los pipelines de Kommo, aplanadas,
 * para resolver una etapa POR NOMBRE → status_id + pipeline_id.
 */
export async function fetchPipelineStages(
  kommoDomain: string,
  kommoToken: string
): Promise<KommoStageLite[]> {
  const url = `https://${kommoDomain}/api/v4/leads/pipelines`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${kommoToken}` },
  });
  if (!res.ok) {
    throw new Error(`fetch pipelines: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    _embedded?: {
      pipelines?: Array<{
        id: number;
        name: string;
        _embedded?: { statuses?: Array<{ id: number; name: string }> };
      }>;
    };
  };
  const out: KommoStageLite[] = [];
  for (const p of json._embedded?.pipelines ?? []) {
    for (const s of p._embedded?.statuses ?? []) {
      out.push({ id: s.id, name: s.name, pipelineId: p.id, pipelineName: p.name });
    }
  }
  return out;
}

export type KommoFieldLite = { id: number; name: string };

/**
 * Trae los custom fields de leads o contacts de Kommo para resolver un campo
 * POR NOMBRE → field_id. 204 = sin campos.
 */
export async function fetchEntityFields(
  entity: "leads" | "contacts",
  kommoDomain: string,
  kommoToken: string
): Promise<KommoFieldLite[]> {
  const url = `https://${kommoDomain}/api/v4/${entity}/custom_fields?limit=250`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${kommoToken}` },
  });
  if (res.status === 204) return [];
  if (!res.ok) {
    throw new Error(`fetch ${entity} fields: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    _embedded?: { custom_fields?: Array<{ id: number; name: string }> };
  };
  return (json._embedded?.custom_fields ?? []).map((f) => ({ id: f.id, name: f.name }));
}

/**
 * Dispara un salesbot de Kommo sobre un lead.
 * Endpoint legacy v2 (sigue soportado en cuentas v4).
 * Throws si la respuesta no es OK.
 */
export async function runSalesbot(
  botId: number,
  kommoLeadId: number,
  kommoDomain: string,
  kommoToken: string
): Promise<void> {
  const url = `https://${kommoDomain}/api/v2/salesbot/run`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kommoToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        bot_id: botId,
        entity_id: kommoLeadId,
        entity_type: 2, // 2 = lead
      },
    ]),
  });
  if (!res.ok) {
    throw new Error(`run salesbot: ${res.status} ${await res.text()}`);
  }
}
