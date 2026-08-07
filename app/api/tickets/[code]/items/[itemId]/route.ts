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

export async function DELETE(_request: Request, { params }: Ctx) {
  const { code, itemId } = await params;
  try {
    return ok(await removeItem(code.toUpperCase(), itemId));
  } catch (error) {
    return fail(error);
  }
}
