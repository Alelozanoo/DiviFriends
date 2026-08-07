import { setClaim } from "@/lib/store";
import { asNumber, bad, fail, ok } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await request.json()) as {
    itemId?: string;
    participantId?: string;
    units?: number;
  };
  if (!body.itemId || !body.participantId) return bad("Falta el plato o el comensal.");

  try {
    const state = await setClaim(
      code.toUpperCase(),
      body.itemId,
      body.participantId,
      asNumber(body.units, 1),
    );
    return ok(state);
  } catch (error) {
    return fail(error);
  }
}
