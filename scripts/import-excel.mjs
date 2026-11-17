// Convierte el Excel de precios en data/products.json.
// Uso: npm run import -- [ruta.xlsx]   (por defecto ./NAVIDAD.xlsx)
// Solo lee el Excel; nunca lo modifica. product-categories.json solo recibe
// los códigos nuevos (las correcciones manuales se conservan). Las fotos viven en R2 y no se tocan.
// Se detiene si un código se repite con datos distintos o si ya existe en el catálogo de perfumes
// (ambos catálogos comparten el catálogo de Meta: un código repetido sobrescribiría el otro producto).
import fs from "node:fs";
import XLSX from "xlsx";

const PERFUMES_URL = "https://raw.githubusercontent.com/NoeGT93/Cat-logo-1---Perfumes-ABACSA/cloudflare/data/products.json";

const file = process.argv[2] || "NAVIDAD.xlsx";
const wb = XLSX.read(fs.readFileSync(file));
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true });

// Localiza la fila de encabezados por la columna "Código"
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const headerIdx = rows.findIndex((r) => r.some((c) => norm(c).startsWith("codigo")));
if (headerIdx < 0) throw new Error("No se encontró la columna 'Código'");
const header = rows[headerIdx].map(norm);
// required = false: la columna puede faltar (el Excel navideño no trae Fardo, Distribuidor, Familia ni Marca)
const col = (start, required = true) => {
  const i = header.findIndex((h) => h.startsWith(start));
  if (i < 0 && required) throw new Error(`Columna no encontrada: ${start}`);
  return i;
};
const codeCol = col("codigo catalogo", false);
const C = {
  no: col("no"), code: codeCol >= 0 ? codeCol : col("codigo"), desc: col("descripcion"), qty: col("cant"),
  unit: col("unitario"), dozen: col("docena"), bundle: col("fardo", false), dist: col("distribuidor", false),
  family: col("familia", false), brand: col("marca", false),
};

const cell = (r, i) => (i >= 0 ? r[i] : null);
const text = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const num = (v) => {
  if (v == null || String(v).trim() === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
// Un precio de volumen igual o mayor al unitario no es una escala real: se omite.
const cheaper = (v, unit) => (v != null && (unit == null || v < unit) ? v : null);

const all = rows
  .slice(headerIdx + 1)
  .filter((r) => text(cell(r, C.code)))
  .map((r, i) => {
    const unit = num(cell(r, C.unit));
    return {
      id: num(cell(r, C.no)) ?? i + 1,
      code: text(cell(r, C.code)),
      description: text(cell(r, C.desc)),
      quantity: num(cell(r, C.qty)),
      prices: {
        unit,
        dozen: cheaper(num(cell(r, C.dozen)), unit),
        bundle: cheaper(num(cell(r, C.bundle)), unit),
        distributor: cheaper(num(cell(r, C.dist)), unit),
      },
      family: text(cell(r, C.family)),
      brand: text(cell(r, C.brand)),
    };
  });

// Códigos repetidos en el Excel: fila idéntica = se omite con aviso; datos distintos = error.
const same = (a, b) => a.description === b.description && JSON.stringify(a.prices) === JSON.stringify(b.prices);
const byCode = new Map();
const problems = [];
for (const p of all) {
  const prev = byCode.get(p.code);
  if (!prev) byCode.set(p.code, p);
  else if (same(prev, p)) console.warn(`Aviso: fila ${p.id} repite el código ${p.code} (fila ${prev.id}) con los mismos datos; se omite.`);
  else problems.push(`código ${p.code} repetido con datos distintos (filas ${prev.id} y ${p.id})`);
}
const products = [...byCode.values()];

// Ningún código puede existir ya en el catálogo de perfumes.
const perfumes = await fetch(PERFUMES_URL).then((r) => {
  if (!r.ok) throw new Error(`No se pudo leer el catálogo de perfumes para comparar códigos (${r.status}). No se importa nada.`);
  return r.json();
});
const taken = new Set(perfumes.map((p) => p.code.toUpperCase()));
for (const p of products) if (taken.has(p.code.toUpperCase())) problems.push(`código ${p.code} ya existe en el catálogo de perfumes`);
for (const p of products) if (!p.prices.unit) problems.push(`código ${p.code} sin precio unitario`);

if (problems.length) {
  console.error("No se importó nada:\n  " + problems.join("\n  "));
  process.exit(1);
}

fs.writeFileSync("data/products.json", JSON.stringify(products, null, 2) + "\n");

// Categoría inferida desde la descripción; editable a mano en product-categories.json
const infer = (d = "") => {
  d = norm(d);
  if (/\bpeluche\b/.test(d)) return "peluches";
  if (/\b(juguete|trompo|squishy)\b/.test(d)) return "juguetes";
  if (/\bcorona\b/.test(d)) return "coronas";
  if (/\b(esferas?|bolas?)\b/.test(d)) return "esferas";
  return "adornos";
};
const catFile = "data/product-categories.json";
const cats = fs.existsSync(catFile) ? JSON.parse(fs.readFileSync(catFile, "utf8")) : {};
for (const p of products) cats[p.code] ??= infer(p.description);
fs.writeFileSync(catFile, JSON.stringify(cats, null, 2) + "\n");

console.log(`${products.length} productos importados desde ${file} · ningún código coincide con el catálogo de perfumes`);
