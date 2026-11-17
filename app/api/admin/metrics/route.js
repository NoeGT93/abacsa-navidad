import { NextResponse } from "next/server";
import { COOKIE, isAuthed } from "@/lib/admin-auth";
import { buildProducts } from "@/lib/catalog";
import { lastDays } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAuthed(req.cookies.get(COOKIE)?.value)) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  const names = Object.fromEntries(buildProducts().map((p) => [p.code, p.name]));
  return NextResponse.json({ days: await lastDays(30), names }, { headers: { "Cache-Control": "no-store" } });
}
