import { splitOffUnits } from "@/lib/store";
import { asNumber, fail, ok, cuerpo } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string; itemId: string }> };

/**
 * Separa unas cuantas unidades de una línea a una línea propia.
 *
 * Devuelve la ficha de la nueva en una cabecera, igual que hace la de
 * comensales: quien separa dos carnes de tres lo hace para repartir justo
 * ésas, y sin el id habría que buscarlas a ojo en la comanda.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { code, itemId } = await params;
  const body = (await cuerpo(request)) as { qty?: number };

  try {
    const { state, newItemId } = await splitOffUnits(
      code.toUpperCase(),
      itemId,
      asNumber(body.qty, 1),
    );
    return ok(state, { "x-item-id": newItemId });
  } catch (error) {
    return fail(error);
  }
}
