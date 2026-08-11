import { setPayer } from "@/lib/store";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { code } = await params;
  
  const body = (await request.json()) as {
    participantId: string | null;
    receiptId: string | null;
  };

  try {
    return ok(await setPayer(code.toUpperCase(), body.participantId, body.receiptId));
  } catch (error) {
    return fail(error);
  }
}
