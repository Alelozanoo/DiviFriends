import { setPayer } from "@/lib/store";
import { usuarioDe } from "@/lib/cuentaServer";
import { fail, ok, cuerpo } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { code } = await params;

  const body = (await cuerpo(request)) as {
    participantId: string | null;
    receiptId: string | null;
    by?: string | null;
  };

  try {
    // Con cuenta o sin ella: la regla de quién puede decirlo vive en `setPayer`.
    const quien = await usuarioDe(request);
    return ok(
      await setPayer(
        code.toUpperCase(),
        body.participantId,
        body.receiptId,
        body.by,
        { conCuenta: Boolean(quien) },
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
