// Contadores diarios en R2 (mismo bucket que las fotos): metrics/<AAAA-MM-DD>.json, día de Guatemala.
// Solo conteos; ningún dato personal.
import { getCloudflareContext } from "@opennextjs/cloudflare";

const PREFIX = "metrics/";
const empty = (date) => ({ date, add: 0, addUnits: 0, whatsapp: 0, whatsappUnits: 0, whatsappTotal: 0, products: {} });

// Fecha en Guatemala (UTC-6, sin horario de verano)
export const today = (now = Date.now()) => new Date(now - 6 * 3600 * 1000).toISOString().slice(0, 10);

async function bucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.PHOTOS;
}

// Suma un evento al día actual. Escritura condicionada al etag con reintentos: dos visitas
// simultáneas no se pisan. Si aun así falla, se pierde un conteo (nunca afecta al cliente).
export async function record(apply) {
  const b = await bucket();
  const key = PREFIX + today() + ".json";
  for (let i = 0; i < 4; i++) {
    const obj = await b.get(key);
    const day = obj ? await obj.json() : empty(today());
    apply(day);
    const res = await b.put(key, JSON.stringify(day), {
      httpMetadata: { contentType: "application/json" },
      onlyIf: obj ? { etagMatches: obj.etag } : { etagDoesNotMatch: "*" },
    });
    if (res) return;
  }
}

// Últimos N días (más reciente primero), con ceros en los días sin actividad.
export async function lastDays(n = 30) {
  const b = await bucket();
  const dates = Array.from({ length: n }, (_, i) => today(Date.now() - i * 86400000));
  return Promise.all(
    dates.map(async (d) => {
      const obj = await b.get(PREFIX + d + ".json");
      return obj ? obj.json() : empty(d);
    })
  );
}
