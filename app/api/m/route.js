import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildProducts } from "@/lib/catalog";
import { record } from "@/lib/metrics";

// Recibe los avisos del contador propio. Siempre responde 204: el navegador no espera nada.
const codes = new Set(buildProducts().map((p) => p.code));
const int = (v, max) => (Number.isInteger(v) && v > 0 && v <= max ? v : null);
const ok = () => new Response(null, { status: 204 });

export async function POST(req) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 2048) return ok();
    // Límite por visitante (60 avisos/minuto) para que nadie infle las cifras
    const { env } = await getCloudflareContext({ async: true });
    const ip = req.headers.get("cf-connecting-ip") || "anon";
    if (env.METRICS_LIMITER && !(await env.METRICS_LIMITER.limit({ key: ip })).success) return ok();

    const body = await req.json();
    if (body.e === "add") {
      const q = int(body.q, 9999);
      if (!codes.has(body.c) || !q) return ok();
      await record((d) => {
        d.add += 1;
        d.addUnits += q;
        d.products[body.c] = (d.products[body.c] || 0) + q;
      });
    } else if (body.e === "whatsapp") {
      const u = int(body.u, 99999);
      const t = Number(body.t);
      if (!u || !(t >= 0 && t < 10_000_000)) return ok();
      await record((d) => {
        d.whatsapp += 1;
        d.whatsappUnits += u;
        d.whatsappTotal += Math.round(t);
      });
    }
  } catch {}
  return ok();
}
