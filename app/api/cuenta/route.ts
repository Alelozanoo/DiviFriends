import { NextResponse } from "next/server";
import {
  actualiza,
  borraCuenta,
  leeOCrea,
  usuarioDe,
} from "@/lib/cuentaServer";
import { borraRastro, ponUsuario } from "@/lib/amigosServer";
import { fail, puerta, cuerpo } from "@/lib/api";
import { callerKey, TOPES } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * La cuenta de quien llama, y sólo la suya.
 *
 * El `uid` no viene en la URL ni en el cuerpo: sale del token que firma
 * Firebase, así que nadie puede leer ni escribir la de otro. Sin token, 401 y
 * fuera; la web sin cuenta nunca llega aquí.
 */
// Una respuesta nueva cada vez, y no una constante: un `Response` reutilizado
// se queda sin cuerpo después del primer uso y las siguientes llegan vacías.
const sinSesion = () =>
  NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });

export async function GET(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  try {
    return NextResponse.json(await leeOCrea(quien));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();

  const alto = await puerta(
    [{ key: `cuenta_guardar_${quien.uid}`, ...TOPES.cuenta.guardar }],
    "Se ha guardado demasiadas veces seguidas. Prueba en un rato.",
  );
  if (alto) return alto;

  try {
    // Un perfil con foto son unos 15 KB; doce divis con caras, unos cientos.
    // Un cuerpo de más de medio mega no es de esta app: `cuerpo` corta ahí y
    // `fail` lo convierte en un 413.
    const body = await cuerpo<{
      perfil?: unknown;
      divis?: unknown;
      avisos?: unknown;
      usuario?: unknown;
    }>(request, 600_000, { estricto: true });
    // El usuario tiene su propia reserva de unicidad; va aparte del resto.
    if (body.usuario !== undefined) await ponUsuario(quien.uid, body.usuario);
    return NextResponse.json(await actualiza(quien, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  const alto = await puerta(
    [{ key: `cuenta_borrar_${callerKey(request)}`, ...TOPES.cuenta.borrar }],
    "Demasiadas cuentas borradas seguidas desde aquí. Prueba en un rato.",
  );
  if (alto) return alto;
  try {
    // Primero el rastro (amigos, código, usuario, asientos, avisos) y después
    // la cuenta: si algo falla a medias, la cuenta sigue ahí para reintentar.
    await borraRastro(quien.uid);
    await borraCuenta(quien.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
