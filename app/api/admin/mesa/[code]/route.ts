import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { esAdmin, usuarioDe } from "@/lib/cuentaServer";
import { firestore, TICKETS } from "@/lib/firebaseAdmin";
import { computeSettlement } from "@/lib/settle";
import { docToState, isTicketDoc } from "@/lib/ticketDoc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Una mesa vista desde la casa, sin entrar en ella.
 *
 * Abrir /t/CÓDIGO como usuario te sienta en la mesa —te pregunta quién eres
 * y te añade—, y eso en el panel no tiene sentido y encima se ve. Esto es la
 * ficha de sólo lectura: quién ha entrado, qué se ha repartido, quién ha
 * pagado y qué se ha tocado. Los mismos números que ven ellos, calculados
 * con el mismo `computeSettlement`. Sólo para la cuenta de la casa.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const quien = await usuarioDe(request);
  if (!esAdmin(quien)) return NextResponse.json({ error: "No existe." }, { status: 404 });
  const { code } = await params;
  const limpio = code.toUpperCase().slice(0, 12);
  try {
    const snap = await firestore().collection(TICKETS).doc(limpio).get();
    const data = snap.data();
    if (!snap.exists || !isTicketDoc(data)) {
      return NextResponse.json({ error: "Esa mesa no existe." }, { status: 404 });
    }
    const state = docToState(limpio, data);
    const s = computeSettlement(state);
    const nombre = (id: string | null) => state.participants.find((p) => p.id === id)?.name ?? null;

    return NextResponse.json(
      {
        code: limpio,
        place: state.ticket.place,
        creada: state.ticket.createdAt,
        actualizada: data.updatedAt,
        cerrada: state.ticket.closed === true,
        moneda: state.ticket.currency,
        total: s.grandTotalCents,
        asignado: s.assignedCents,
        sinDueno: s.unassignedCents,
        pendiente: s.pendingCents,
        completo: s.complete,
        tickets: state.receipts.length,
        lineas: {
          total: state.items.length,
          repartidas: Object.values(s.byItem).filter((b) => b.settled).length,
        },
        pagador: nombre(state.ticket.payerId),
        personas: s.byParticipant.map((b) => ({
          nombre: b.name,
          color: b.color,
          esPagador: b.participantId === state.ticket.payerId,
          suyo: b.itemsCents + b.extrasCents,
          debe: b.owesCents,
          saldado: b.settled,
        })),
        pagos: state.pagos.map((p) => ({
          de: nombre(p.fromId),
          a: nombre(p.toId),
          cents: p.cents,
          via: p.via,
          estado: p.estado,
          at: p.at,
        })),
        cambios: state.events.slice(0, 20).map((e) => ({
          at: e.at,
          kind: e.kind,
          by: e.by,
          what: e.what,
          cents: e.cents,
        })),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
