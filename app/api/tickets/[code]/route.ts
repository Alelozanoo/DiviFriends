import { getTicketState, patchTicket } from "@/lib/store";
import { bad, fail, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { code } = await params;
  try {
    const state = await getTicketState(code.toUpperCase());
    if (!state) return bad("Esta comanda no existe o ha caducado.", 404);
    return ok(state);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await request.json()) as {
    tipCents?: number;
    totalCents?: number;
    place?: string;
    tableLabel?: string;
  };

  try {
    return ok(await patchTicket(code.toUpperCase(), body));
  } catch (error) {
    return fail(error);
  }
}
