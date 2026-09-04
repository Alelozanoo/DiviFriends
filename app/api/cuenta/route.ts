import { NextResponse } from "next/server";
import {
  actualiza,
  borraCuenta,
  leeOCrea,
  usuarioDe,
} from "@/lib/cuentaServer";
import { borraRastro, ponUsuario } from "@/lib/amigosServer";
import { fail, puerta, cuerpo } from "@/lib/api";
import { apuntaEnHoja } from "@/lib/hojaRegistros";
import { avisaAlta } from "@/lib/correo";
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
      /** Códigos de divis que se quitan de la cuenta. */
      quitar?: unknown;
      /** `true` al aceptar los términos en el registro. */
      terminos?: unknown;
      /** Si quiere las novedades por correo. */
      novedades?: unknown;
    }>(request, 600_000, { estricto: true });
    // El usuario tiene su propia reserva de unicidad; va aparte del resto.
    if (body.usuario !== undefined) await ponUsuario(quien.uid, body.usuario);
    // Para saber si es la primera vez que acepta los términos: eso es un alta.
    const antes = body.terminos === true ? await leeOCrea(quien) : null;
    const cuenta = await actualiza(quien, body);
    // Los términos y las novedades se apuntan también en la hoja de registros,
    // antes de contestar: en Cloud Run lo que queda pendiente al contestar se
    // puede quedar sin hacer.
    if ((body.terminos === true || typeof body.novedades === "boolean") && quien.email) {
      await apuntaEnHoja({
        correo: quien.email,
        nombre: cuenta.perfil?.name,
        terminos: cuenta.terminos,
        novedades: cuenta.novedades,
      });
    }
    if (antes && !antes.terminos && cuenta.terminos && quien.email) {
      await avisaAlta({
        nombre: cuenta.perfil?.name ?? "",
        correo: quien.email,
        usuario: cuenta.usuario,
        novedades: cuenta.novedades,
        bizum: cuenta.perfil?.bizum,
        revolut: cuenta.perfil?.revolut,
      });
    }
    return NextResponse.json(cuenta);
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
    // Fuera de la hoja también: quien borra la cuenta no quiere seguir en ninguna lista.
    if (quien.email) await apuntaEnHoja({ accion: "borrar", correo: quien.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
