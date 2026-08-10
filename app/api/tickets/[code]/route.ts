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
  // `by` es quien dice ser el que hace el cambio: va al historial tal cual,
  // sin comprobarlo. Aquí no hay sesiones, y el historial es un registro
  // social, no un control de acceso.
  const { by, ...patch } = (await request.json()) as {
    totalCents?: number;
    place?: string;
    tableLabel?: string;
    by?: string | null;
  };

  try {
    return ok(await patchTicket(code.toUpperCase(), patch, by));
  } catch (error) {
    return fail(error);
  }
}
