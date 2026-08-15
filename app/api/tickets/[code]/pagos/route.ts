import { declararPago, resolverPago } from "@/lib/store";
import { fail, ok } from "@/lib/api";
import type { Via } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

/** «Ya te lo he mandado»: lo dice quien paga, al volver de su banco. */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await request.json()) as {
    fromId: string;
    toId: string;
    cents: number;
    via: Via;
  };

  try {
    const via: Via = body.via === "revolut" || body.via === "bizum" ? body.via : "mano";
    return ok(
      await declararPago(code.toUpperCase(), body.fromId, body.toId, body.cents, via),
    );
  } catch (error) {
    return fail(error);
  }
}

/** «Sí, me ha llegado» o «todavía no»: lo dice quien cobra. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await request.json()) as { fromId: string; toId: string; ok: boolean };

  try {
    return ok(await resolverPago(code.toUpperCase(), body.fromId, body.toId, body.ok === true));
  } catch (error) {
    return fail(error);
  }
}
