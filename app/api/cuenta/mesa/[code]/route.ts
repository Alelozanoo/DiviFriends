import { NextResponse } from "next/server";
import { usuarioDe } from "@/lib/cuentaServer";
import { asientoDe, marcaVisto, vinculaAsiento } from "@/lib/amigosServer";
import { getTicketState } from "@/lib/store";
import { fail, cuerpo } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };
// Una respuesta nueva cada vez, y no una constante: un `Response` reutilizado
// se queda sin cuerpo después del primer uso y las siguientes llegan vacías.
const sinSesion = () =>
  NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });

/**
 * ¿Tengo asiento en esta mesa?
 *
 * Lo pregunta la comanda al abrirse con cuenta y sin saber quién eres: si un
 * amigo te metió, aquí está tu participante y te sientas sin que te pregunten.
 * Se comprueba que el asiento siga existiendo en la mesa: si te quitaron, el
 * asiento reservado ya no vale.
 */
export async function GET(request: Request, { params }: Ctx) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  const { code } = await params;
  try {
    const participantId = await asientoDe(code.toUpperCase(), quien.uid);
    if (!participantId) return NextResponse.json({ participantId: null });
    const state = await getTicketState(code.toUpperCase());
    const sigue =
      state?.participants.some((p) => p.id === participantId) ?? false;
    // Abrirla es verla: el «+1» de la cuenta se apaga.
    if (sigue) void marcaVisto(code.toUpperCase(), quien.uid);
    return NextResponse.json({ participantId: sigue ? participantId : null });
  } catch (error) {
    return fail(error);
  }
}

/**
 * «Este asiento es mío.» Lo dice quien acaba de apuntarse con cuenta, para que
 * la mesa sepa a quién avisar cuando se cierre o cuando le paguen.
 */
export async function POST(request: Request, { params }: Ctx) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  const { code } = await params;
  const { participantId } = (await cuerpo(request)) as {
    participantId?: string;
  };
  if (typeof participantId !== "string" || !participantId) {
    return NextResponse.json({ error: "Falta el asiento." }, { status: 400 });
  }
  try {
    const state = await getTicketState(code.toUpperCase());
    if (!state?.participants.some((p) => p.id === participantId)) {
      return NextResponse.json(
        { error: "Ese asiento no está en esta mesa." },
        { status: 404 },
      );
    }
    await vinculaAsiento(code.toUpperCase(), quien.uid, participantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
