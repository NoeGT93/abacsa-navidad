import Link from "next/link";
import { headers } from "next/headers";
import { Inter, Poppins } from "next/font/google";
import { CartProvider } from "@/components/Cart";
import Header from "@/components/Header";
import { getProducts } from "@/lib/catalog";
import { CATEGORIES, SITE_URL, WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "@/lib/config";
import "./globals.css";

// Token de Cloudflare Web Analytics del sitio abacsa-navidad (Panel → Web Analytics → Agregar sitio).
const CF_BEACON_TOKEN = "";

// Inter para lectura; Poppins para títulos, precios y botones.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

// metadataBase = dominio desde el que se visita (o NEXT_PUBLIC_SITE_URL): las vistas previas de
// WhatsApp/Facebook usan URLs absolutas de las fotos.
export async function generateMetadata() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const base = SITE_URL || (host ? `${h.get("x-forwarded-proto") || "https"}://${host}` : undefined);
  return {
    ...(base && { metadataBase: new URL(base) }),
    title: "Catálogo Navideño ABACSA",
    description: "Adornos, esferas, coronas, juguetes y peluches para esta Navidad. Compra al detalle o por mayor y pide por WhatsApp.",
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

// Todas las páginas leen las fotos de R2 en cada visita (sin deploy al cambiar fotos).
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }) {
  // Solo lo que el pedido necesita para mostrar nombre, foto y precio.
  const products = (await getProducts()).map(({ code, name, mainImage, prices, fromPrice }) => ({ code, name, mainImage, prices, fromPrice }));
  return (
    <html lang="es" className={`${sans.variable} ${display.variable}`}>
      <body>
        <CartProvider products={products}>
          <Header />
          <main className="main">{children}</main>
          <footer className="site-footer">
            <div className="wrap footer-grid">
              <div>
                <img src="/brand/logo.png" alt="ABACSA — Encuentra lo que necesitas y descubre mucho más." className="footer-logo" />
              </div>
              <div>
                <h3>Catálogo</h3>
                <Link href="/catalogo">Todos los productos</Link>
                {CATEGORIES.map((c) => (
                  <Link key={c.key} href={`/catalogo?cat=${c.key}`}>{c.label}</Link>
                ))}
              </div>
              <div>
                <h3>Contacto</h3>
                <p>Quetzaltenango, Guatemala</p>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp {WHATSAPP_DISPLAY}
                </a>
              </div>
            </div>
            <div className="wrap footer-legal">© ABACSA · Precios sujetos a confirmación por WhatsApp</div>
          </footer>
        </CartProvider>
        {/* Cloudflare Web Analytics: visitas, origen y páginas más vistas (sin cookies).
            Token propio del sitio navideño (no el de perfumes): se activa al poner CF_BEACON_TOKEN. */}
        {CF_BEACON_TOKEN && (
          <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}></script>
        )}
      </body>
    </html>
  );
}
