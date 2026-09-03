import { NextResponse } from "next/server";
import { usuarioDe } from "@/lib/cuentaServer";
import {
  asientoDe,
  correoDe,
  perfilDe,
  reservaAsiento,
  sonAmigos,
} from "@/lib/amigosServer";
import { correoInvitacion, mandaAviso, origenDe } from "@/lib/correo";
import { addParticipant, getTicketState } from "@/lib/store";
import { fail, ok, puerta, cuerpo } from "@/lib/api";
import { TOPES } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

/**
 * Meter a un amigo en la mesa.
 *
 * Tres comprobaciones antes de tocar nada, y en este orden: que quien llama
 * tenga cuenta, que sea amigo de a quien mete —a nadie se le mete en mesas
 * sin que haya dicho sí antes—, y que la mesa exista. Luego el participante se
 * crea por el mismo camino que si se apuntara él, con su nombre y su cara, se
 * le reserva el asiento, y se le manda el correo con los frenos de siempre.
 *
 * El correo puede no salir —tope, avisos apagados, ya mandado— y la mesa se
 * queda igual de bien: el amigo está dentro y lo verá al abrir el enlace.
 */
export async function POST(request: Request, { params }: Ctx) {
  const quien = await usuarioDe(request);
  if (!quien)
    return NextResponse.json(
      { error: "Hay que entrar primero." },
      { status: 401 },
    );

  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const { uid } = (await cuerpo(request)) as { uid?: string };
  if (typeof uid !== "string" || !uid || uid.length > 128) {
    return NextResponse.json({ error: "Falta a quién." }, { status: 400 });
  }
  const alto = await puerta(
    [{ key: `cuenta_invitar_${quien.uid}`, ...TOPES.cuenta.invitar }],
    "Has metido a demasiada gente hoy. Mañana más.",
  );
  if (alto) return alto;

  try {
    if (!(await sonAmigos(quien.uid, uid))) {
      return NextResponse.json(
        { error: "Sólo puedes meter a tus amigos." },
        { status: 403 },
      );
    }
    // Sólo desde dentro: quien mete a alguien tiene que estar sentado en esa
    // mesa. Si no, con crear mesas vacías se le podría llenar el buzón a un amigo.
    if (!(await asientoDe(code, quien.uid))) {
      return NextResponse.json(
        { error: "Primero siéntate en la mesa." },
        { status: 403 },
      );
    }
    const [perfilAmigo, perfilMio, existe] = await Promise.all([
      perfilDe(uid),
      perfilDe(quien.uid),
      getTicketState(code),
    ]);
    if (!existe)
      return NextResponse.json(
        { error: "Esta comanda no existe o ha caducado." },
        { status: 404 },
      );
    if (!perfilAmigo?.name)
      return NextResponse.json(
        { error: "Esa persona no tiene nombre todavía." },
        { status: 409 },
      );

    const { state, participantId } = await addParticipant(
      code,
      perfilAmigo.name,
      perfilAmigo.avatar,
      perfilAmigo.bizum,
      perfilAmigo.revolut,
    );
    await reservaAsiento({
      code,
      uid,
      participantId,
      por: quien.uid,
      mesa: state.ticket.place,
      porNombre: perfilMio?.name ?? quien.nombre ?? "Alguien",
    });

    const email = await correoDe(uid);
    const correo = email
      ? await mandaAviso(
          correoInvitacion({
            uid,
            email,
            origen: origenDe(request),
            code,
            mesa: state.ticket.place,
            quien: perfilMio?.name ?? quien.nombre ?? "Alguien",
          }),
        )
      : "sin-correo";

    return ok(state, {
      "x-participant-id": participantId,
      "x-correo": correo === "mandado" ? "mandado" : "no",
    });
  } catch (error) {
    return fail(error);
  }
}
