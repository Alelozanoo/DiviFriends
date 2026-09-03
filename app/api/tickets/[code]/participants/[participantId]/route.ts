import { patchParticipant, removeParticipant } from "@/lib/store";
import { fail, ok, cuerpo } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string; participantId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { code, participantId } = await params;
  const body = (await cuerpo(request)) as {
    name?: string;
    avatar?: string;
    settled?: boolean;
    isPayer?: boolean;
    revolut?: string | null;
    bizum?: string | null;
  };

  try {
    return ok(await patchParticipant(code.toUpperCase(), participantId, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { code, participantId } = await params;
  try {
    return ok(await removeParticipant(code.toUpperCase(), participantId));
  } catch (error) {
    return fail(error);
  }
}
