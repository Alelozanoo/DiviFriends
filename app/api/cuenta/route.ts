import { after, NextResponse } from "next/server";
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
    const { nueva, ...cuenta } = await leeOCrea(quien);
    /*
      La fila de la hoja se abre aquí, al entrar, que es por donde pasa todo
      el mundo: así no falta nadie en la lista aunque deje el registro a
      medias. El **aviso a la casa** no sale aquí, sale al terminar el
      registro (el PATCH de abajo): hasta entonces de esa persona sólo se
      sabe el correo, y un correo que dice «alta nueva: (sin nombre)» no
      sirve para nada.

      Con `after` y no esperándola, que es lo que se hacía antes. El Apps
      Script de la hoja tarda entre dos segundos y medio y tres y medio
      —medido—, y esto es la **primera** llamada de alguien que acaba de
      entrar con Google: esos tres segundos eran pantalla en blanco entre el
      botón de Google y la página de registro. `after` deja el trabajo para
      después de contestar y la plataforma lo termina igual, que era justo lo
      que se temía al ponerle el `await`.

      Si la hoja falla no pasa nada —lo apunta en el log y sigue—, porque la
      cuenta manda sobre la hoja y nunca al revés.
    */
    if (nueva && quien.email) {
      const correo = quien.email;
      after(() =>
        apuntaEnHoja({
          correo,
          nombre: cuenta.perfil?.name,
          terminos: cuenta.terminos,
          novedades: cuenta.novedades,
        }),
      );
    }
    return NextResponse.json(cuenta);
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
      /** `true` al terminar la página de registro. */
      registrado?: unknown;
    }>(request, 600_000, { estricto: true });
    // El usuario tiene su propia reserva de unicidad; va aparte del resto.
    if (body.usuario !== undefined) await ponUsuario(quien.uid, body.usuario);
    const { recienRegistrado, ...cuenta } = await actualiza(quien, body);
    // Los términos y las novedades se apuntan también en la hoja de registros,
    // antes de contestar: en Cloud Run lo que queda pendiente al contestar se
    // puede quedar sin hacer.
    /*
      Y lo mismo al guardar: la hoja y el correo van detrás de la respuesta.

      Aquí el que espera es alguien que acaba de pulsar el botón que cierra su
      registro, y entre la hoja —tres segundos— y el correo por SMTP se le
      quedaba el botón girando sin motivo: ninguna de las dos cosas cambia lo
      que va a ver a continuación.
    */
    const correo = quien.email;
    if ((body.terminos === true || typeof body.novedades === "boolean") && correo) {
      after(() =>
        apuntaEnHoja({
          correo,
          nombre: cuenta.perfil?.name,
          terminos: cuenta.terminos,
          novedades: cuenta.novedades,
        }),
      );
    }

    /*
      El aviso de alta, al terminar el registro y no al entrar.

      Estaba en el GET, o sea en el primer segundo de la sesión de Google, y
      llegaba vacío: sin nombre, sin usuario y sin saber si quería novedades,
      porque nada de eso se ha preguntado todavía. Aquí ya está todo puesto.
      `recienRegistrado` es la marca que hace que salga una vez y sólo una.
    */
    if (recienRegistrado && correo) {
      after(() =>
        avisaAlta({
          nombre: cuenta.perfil?.name ?? "",
          correo,
          usuario: cuenta.usuario,
          novedades: cuenta.novedades,
          bizum: cuenta.perfil?.bizum,
          revolut: cuenta.perfil?.revolut,
        }),
      );
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
