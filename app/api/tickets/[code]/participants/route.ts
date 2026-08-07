import { addParticipant } from "@/lib/store";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await request.json()) as { name?: string };

  try {
    const { state, participantId } = await addParticipant(code.toUpperCase(), body.name ?? "");
    return ok(state, { "x-participant-id": participantId });
  } catch (error) {
    return fail(error);
  }
}
