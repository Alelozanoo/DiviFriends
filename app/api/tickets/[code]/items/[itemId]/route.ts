import { patchItem, removeItem } from "@/lib/store";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { code, itemId } = await params;
  const body = (await request.json()) as {
    name?: string;
    qty?: number;
    unitCents?: number;
    totalCents?: number;
    splitInto?: number;
  };

  try {
    return ok(await patchItem(code.toUpperCase(), itemId, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { code, itemId } = await params;
  // Quitar una línea baja el total de la mesa, así que queda anotado quién lo
  // pidió. Va en la URL y no en el cuerpo porque hay proxies y clientes que
  // descartan el cuerpo de un DELETE sin avisar.
  const by = new URL(request.url).searchParams.get("by");
  try {
    return ok(await removeItem(code.toUpperCase(), itemId, by));
  } catch (error) {
    return fail(error);
  }
}
