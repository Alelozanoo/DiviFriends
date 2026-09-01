import { NextResponse } from "next/server";
import { origenPublico } from "@/lib/tiktok";
import { salir } from "@/lib/tiktokSesion";

export const runtime = "nodejs";

/** Olvida la cuenta conectada. */
export async function GET() {
  await salir();
  return NextResponse.redirect(new URL("/tiktok", await origenPublico()));
}
