// Única puerta de entrada a los datos. Para migrar a una API/BD, reemplazar getProducts().
// Productos, precios y categorías vienen del Excel (data/*.json, parte del código);
// las fotos vienen de R2 en cada visita, así el admin no necesita un nuevo deploy.
import productsData from "@/data/products.json";
import categoriesData from "@/data/product-categories.json";
import { getMap } from "./photos";

// Modelo de proveedor al inicio: "XD-66006 CAJA…", "23H-207 ADORNO…"
const MODEL = /^[A-Z0-9]+-[A-Z0-9]+\s+(?=[A-ZÁÉÍÓÚÑ]{3})/i;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "XD-66006 CAJA ESFERA NAVIDEÑA 6CM (12 PCS) 20250429051" -> "Caja Esfera Navideña 6cm (12 Pcs)".
// Quita el código del producto, números largos (códigos de proveedor), el modelo inicial y "-PZA-" / "-SET -".
// La descripción completa se conserva aparte.
export function displayName(description = "", code = "") {
  const base =
    description
      .replace(code ? new RegExp(`\\s*${escape(code)}\\b`, "gi") : "", "")
      .replace(/\s*\b\d{7,}\b/g, "")
      .replace(MODEL, "")
      .replace(/\s*-\s*(PZA|SET)\s*-\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim() || description;
  return base.toLowerCase().replace(/(^|[\s(/])(\p{L})/gu, (_, s, c) => s + c.toUpperCase());
}

// images: asociación código -> fotos ({} = sin fotos).
export function buildProducts(images = {}) {
  const categories = categoriesData;
  return productsData.map((p) => {
    const valid = Object.values(p.prices).filter((v) => v != null);
    const img = images[p.code] || {};
    const gallery = img.gallery || [];
    return {
      ...p,
      name: displayName(p.description, p.code),
      category: categories[p.code] || null,
      fromPrice: valid.length ? Math.min(...valid) : null,
      mainImage: img.mainImage || gallery[0] || null,
      gallery,
    };
  });
}

export async function getProducts() {
  return buildProducts(await getMap());
}

export async function getProduct(code) {
  return (await getProducts()).find((p) => p.code === code) || null;
}
