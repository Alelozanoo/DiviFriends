import { NextResponse } from "next/server";
import { usuarioDe } from "@/lib/cuentaServer";
import {
  asientoDe,
  correoDe,
  cuentasDeLaMesa,
  perfilDe,
  vinculaAsiento,
} from "@/lib/amigosServer";
import { correoRecordatorio, mandaAviso, origenDe } from "@/lib/correo";
import { computeSettlement } from "@/lib/settle";
import { PORQUE, puedeRecordar, TONOS, type Tono } from "@/lib/recordatorio";
import { getTicketState } from "@/lib/store";
import { fail, puerta, cuerpo } from "@/lib/api";
import { TOPES } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

/**
 * «Recuérdaselo»: quien puso la tarjeta le manda un correo a quien le debe.
 *
 * Cinco candados, y en este orden, porque cada uno es más barato que el
 * siguiente: que quien llama tenga cuenta; que no haya mandado cuarenta hoy;
 * que esté sentado en esta mesa; que sea quien pagó —nadie reclama en nombre
 * de otro—; y que la persona a la que escribe deba de verdad, según las
 * mismas cuentas que ve la pantalla. Los tres últimos los decide
 * `puedeRecordar`, que es puro y tiene sus pruebas. Sólo entonces se mira si
 * el otro tiene cuenta, porque un correo sólo se puede mandar a quien lo dio.
 *
 * Una vez al día por persona y mesa: la clave del aviso lleva la fecha, y
 * `mandaAviso` devuelve «repetido» al segundo intento sin mandar nada. Lo
 * demás —el tope diario global, los correos apagados, la baja— lo ponen los
 * frenos de siempre.
 */
export async function POST(request: Request, { params }: Ctx) {
  const quien = await usuarioDe(request);
  if (!quien)
    return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });

  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const { participantId, tono, miAsiento } = (await cuerpo(request)) as {
    participantId?: string;
    tono?: string;
    miAsiento?: string;
  };
  if (typeof participantId !== "string" || !participantId || participantId.length > 64)
    return NextResponse.json({ error: "Falta a quién." }, { status: 400 });
  if (!TONOS.includes(tono as Tono))
    return NextResponse.json({ error: "Ese tono no existe." }, { status: 400 });

  const alto = await puerta(
    [{ key: `cuenta_recordar_${quien.uid}`, ...TOPES.cuenta.recordar }],
    "Has mandado demasiados recordatorios hoy. Mañana más.",
  );
  if (alto) return alto;

  try {
    const state = await getTicketState(code);
    if (!state)
      return NextResponse.json(
        { error: "Esta comanda no existe o ha caducado." },
        { status: 404 },
      );

    // Sentado: con el asiento enlazado, o con el que guarda el móvil si es de
    // verdad de esta mesa — el mismo criterio que para meter a un amigo.
    let yo = await asientoDe(code, quien.uid);
    const asientoValido =
      typeof miAsiento === "string" &&
      miAsiento.length <= 64 &&
      state.participants.some((p) => p.id === miAsiento);
    if (!yo && asientoValido) {
      await vinculaAsiento(code, quien.uid, miAsiento);
      yo = miAsiento;
    }
    if (!yo)
      return NextResponse.json({ error: "Primero siéntate en la mesa." }, { status: 403 });

    // Quién puede reclamar a quién y por cuánto: en `lib/recordatorio.ts`,
    // que es puro y está probado — es lo que decide si a alguien le llega un
    // correo con su nombre y una cifra.
    const veredicto = puedeRecordar({
      state,
      settlement: computeSettlement(state),
      yo,
      aQuien: participantId,
    });
    if (!veredicto.puede) {
      const { mensaje, status } = PORQUE[veredicto.porque];
      return NextResponse.json({ error: mensaje }, { status });
    }
    const cents = veredicto.cents;

    const uidDeudor = (await cuentasDeLaMesa(code)).get(participantId);
    const email = uidDeudor ? await correoDe(uidDeudor) : null;
    if (!uidDeudor || !email)
      return NextResponse.json({ resultado: "sin-cuenta" });

    const perfilMio = await perfilDe(quien.uid);
    const resultado = await mandaAviso(
      correoRecordatorio({
        uid: uidDeudor,
        email,
        origen: origenDe(request),
        code,
        mesa: state.ticket.place,
        quien: perfilMio?.name ?? quien.nombre ?? "Quien pagó",
        cents,
        tono: tono as Tono,
        dia: new Date().toISOString().slice(0, 10),
      }),
    );
    return NextResponse.json({ resultado });
  } catch (error) {
    return fail(error);
  }
}
