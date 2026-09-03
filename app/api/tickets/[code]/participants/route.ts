import { addParticipant } from "@/lib/store";
import { fail, ok, cuerpo } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const body = (await cuerpo(request)) as {
    name?: string;
    avatar?: string;
    bizum?: string;
    revolut?: string;
  };

  try {
    const { state, participantId } = await addParticipant(
      code.toUpperCase(),
      body.name ?? "",
      body.avatar,
      body.bizum,
      body.revolut,
    );
    return ok(state, { "x-participant-id": participantId });
  } catch (error) {
    return fail(error);
  }
}
