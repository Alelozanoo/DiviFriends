import { addItem } from "@/lib/store";
import { parseMoney } from "@/lib/format";
import { asNumber, fail, ok, cuerpo } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

/** Añade una línea que el OCR se dejó, o algo pedido después. */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await cuerpo(request)) as {
    name?: string;
    qty?: number;
    price?: string | number;
    by?: string | null;
  };

  try {
    const state = await addItem(
      code.toUpperCase(),
      {
        name: body.name ?? "",
        qty: asNumber(body.qty, 1),
        unitCents: parseMoney(body.price ?? null),
      },
      body.by,
    );
    return ok(state);
  } catch (error) {
    return fail(error);
  }
}
