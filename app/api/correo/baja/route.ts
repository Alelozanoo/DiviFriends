import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { firmaValida } from "@/lib/correo";
import { callerKey, consume, TOPES } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * La baja de un toque, sin entrar.
 *
 * El enlace de cada correo trae el `uid` y una firma; si la firma cuadra, los
 * avisos de esa cuenta se apagan y se enseña una página que lo dice. `GET` y
 * no `POST` a propósito: es lo que abre un enlace de un correo, y lo que
 * pulsa Gmail en «Cancelar suscripción». `POST` se acepta también por si el
 * cliente de correo usa la cabecera de un toque.
 */
async function baja(request: Request) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";

  // Frenar por IP antes de mirar la firma: probar firmas no es gratis.
  const gate = await consume([
    { key: `correo_baja_${callerKey(request)}`, ...TOPES.cuenta.baja },
  ]);
  if (!gate.ok) {
    return new NextResponse(pagina(false), {
      status: 429,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": String(gate.retryAfterSeconds),
      },
    });
  }

  const vale =
    uid.length <= 128 && token.length <= 128 && firmaValida(uid, token);
  if (vale) {
    await firestore()
      .collection("users")
      .doc(uid)
      .set({ avisos: false }, { merge: true });
  }

  return new NextResponse(pagina(Boolean(vale)), {
    status: vale ? 200 : 400,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export const GET = baja;
export const POST = baja;

function pagina(bien: boolean): string {
  const titulo = bien ? "Avisos apagados" : "Este enlace no vale";
  const texto = bien
    ? "No recibirás más correos de DiviFriends. Puedes volver a encenderlos cuando quieras desde «Tu cuenta»."
    : "El enlace está incompleto o ya no es válido. Puedes apagar los avisos desde «Tu cuenta» en divifriends.es.";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo} · DiviFriends</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#14100d;color:#f4ece0;font-family:ui-sans-serif,system-ui,sans-serif;padding:24px}
main{max-width:420px;background:#f4ece0;color:#14100d;padding:28px 26px}h1{margin:0 0 10px;font-size:22px}p{margin:0;line-height:1.5;color:#6b5f52}a{color:#14100d}</style></head>
<body><main><h1>${titulo}</h1><p>${texto}</p><p style="margin-top:18px"><a href="/">Volver a DiviFriends</a></p></main></body></html>`;
}
