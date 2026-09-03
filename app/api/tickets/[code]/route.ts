import { getTicketState, patchTicket } from "@/lib/store";
import { bad, fail, ok, cuerpo } from "@/lib/api";
import { avisaCierre } from "@/lib/avisosServer";

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
  const { by, ...patch } = (await cuerpo(request)) as {
    totalCents?: number;
    place?: string;
    tableLabel?: string;
    closed?: boolean;
    by?: string | null;
  };

  try {
    const state = await patchTicket(code.toUpperCase(), patch, by);
    // Después de guardar, y sin esperar al correo: si no sale, la mesa está
    // cerrada igual. Sólo cuando de verdad se cierra, no en cada retoque.
    if (patch.closed === true)
      void avisaCierre(request, code.toUpperCase(), state);
    return ok(state);
  } catch (error) {
    return fail(error);
  }
}
