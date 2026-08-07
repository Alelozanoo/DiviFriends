import { setClaim } from "@/lib/store";
import { asNumber, bad, fail, ok } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

/**
 * Una sola llamada para «me pido esto» y para «esto va entre N»: así el móvil
 * no tiene que encadenar dos peticiones para saber cuánto le toca.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await request.json()) as {
    itemId?: string;
    participantId?: string;
    shares?: number;
    splitInto?: number;
  };
  if (!body.itemId || !body.participantId) return bad("Falta el plato o el comensal.");

  try {
    const state = await setClaim(
      code.toUpperCase(),
      body.itemId,
      body.participantId,
      asNumber(body.shares, 1),
      body.splitInto === undefined ? undefined : asNumber(body.splitInto, 1),
    );
    return ok(state);
  } catch (error) {
    return fail(error);
  }
}
