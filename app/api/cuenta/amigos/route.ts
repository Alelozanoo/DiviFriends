import { NextResponse } from "next/server";
import { usuarioDe } from "@/lib/cuentaServer";
import {
  aceptaAmistad,
  codigoDe,
  correoDe,
  listaAmigos,
  perfilDe,
  perfilPublico,
  pideAmistad,
  pideAmistadA,
  quitaAmigo,
} from "@/lib/amigosServer";
import { correoSolicitud, mandaAviso, origenDe } from "@/lib/correo";
import { fail, puerta, cuerpo } from "@/lib/api";
import { TOPES } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Una respuesta nueva cada vez, y no una constante: un `Response` reutilizado
// se queda sin cuerpo después del primer uso y las siguientes llegan vacías.
const sinSesion = () =>
  NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });

/** Tu lista y tu código, para compartirlo. */
export async function GET(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  try {
    const [amigos, codigo, yoPublico] = await Promise.all([
      listaAmigos(quien.uid),
      codigoDe(quien.uid),
      perfilPublico(quien.uid),
    ]);
    // `yo` para que la hoja sepa qué peticiones son suyas y cuáles le toca
    // aceptar, sin tener que deducirlo de la lista. `usuario` para el enlace.
    return NextResponse.json({
      amigos,
      codigo,
      usuario: yoPublico?.usuario ?? null,
      yo: quien.uid,
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Pedir la amistad: con un código o un @usuario, o —desde la ficha de alguien
 * de la mesa— directamente con su cuenta.
 */
export async function POST(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  const { codigo, uid } = (await cuerpo(request)) as {
    codigo?: string;
    uid?: string;
  };
  const porCuenta = typeof uid === "string" && uid.length > 0 && uid.length <= 128;
  if (!porCuenta && (typeof codigo !== "string" || codigo.length > 40)) {
    return NextResponse.json({ error: "Falta el código." }, { status: 400 });
  }
  const alto = await puerta(
    [{ key: `cuenta_solicitud_${quien.uid}`, ...TOPES.cuenta.solicitud }],
    "Has pedido demasiadas amistades hoy. Mañana más.",
  );
  if (alto) return alto;
  try {
    const { perfil, estado, nueva } = porCuenta
      ? await pideAmistadA(quien.uid, uid)
      : await pideAmistad(quien.uid, codigo as string);

    // Sólo cuando la solicitud es nueva: repetirla no vuelve a avisar, y
    // aceptar tampoco (eso ya lo ve el otro en su lista).
    if (nueva) {
      const [email, mio, miCodigo] = await Promise.all([
        correoDe(perfil.uid),
        perfilDe(quien.uid),
        codigoDe(quien.uid),
      ]);
      if (email) {
        void mandaAviso(
          correoSolicitud({
            uid: perfil.uid,
            email,
            origen: origenDe(request),
            quien: mio?.name ?? quien.nombre ?? "Alguien",
            codigo: (await perfilPublico(quien.uid))?.usuario ?? miCodigo,
            uidPide: quien.uid,
          }),
        );
      }
    }

    return NextResponse.json({
      ok: true,
      perfil,
      estado,
      amigos: await listaAmigos(quien.uid),
    });
  } catch (error) {
    return fail(error);
  }
}

/** Aceptar a quien te lo pidió. */
export async function PATCH(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  const { uid } = (await cuerpo(request)) as { uid?: string };
  if (typeof uid !== "string")
    return NextResponse.json({ error: "Falta quién." }, { status: 400 });
  try {
    await aceptaAmistad(quien.uid, uid);
    return NextResponse.json({
      ok: true,
      amigos: await listaAmigos(quien.uid),
    });
  } catch (error) {
    return fail(error);
  }
}

/** Quitar, o rechazar. */
export async function DELETE(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  const { uid } = (await cuerpo(request)) as { uid?: string };
  if (typeof uid !== "string")
    return NextResponse.json({ error: "Falta quién." }, { status: 400 });
  try {
    await quitaAmigo(quien.uid, uid);
    return NextResponse.json({
      ok: true,
      amigos: await listaAmigos(quien.uid),
    });
  } catch (error) {
    return fail(error);
  }
}
