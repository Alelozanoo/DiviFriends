import { NextResponse } from "next/server";
import { salir } from "@/lib/tiktokSesion";

export const runtime = "nodejs";

/** Olvida la cuenta conectada. */
export async function GET(request: Request) {
  await salir();
  return NextResponse.redirect(new URL("/tiktok", new URL(request.url).origin));
}
