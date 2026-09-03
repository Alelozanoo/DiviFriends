import { computeSettlement } from "./settle";
import type { TicketState } from "./types";
import {
  correoCierre,
  correoPago,
  hayCorreo,
  mandaAviso,
  origenDe,
} from "./correo";
import { correoDe, cuentasDeLaMesa } from "./amigosServer";

/**
 * Los avisos que salen de lo que pasa en una mesa.
 *
 * Se llaman desde las rutas de la API *después* de que el cambio se haya
 * guardado, y nunca antes ni en medio: si el correo falla, la mesa ya está
 * bien y nadie se entera de que el correo no salió salvo el registro.
 *
 * Sólo se avisa a quien está en la mesa con cuenta —a los demás no hay dónde—
 * y con los frenos de `lib/correo.ts` delante de cada uno.
 */

/** Se ha cerrado la mesa: a cada uno con cuenta, lo que le toca. */
export async function avisaCierre(
  request: Request,
  code: string,
  state: TicketState,
): Promise<void> {
  if (!hayCorreo) return;
  try {
    const cuentas = await cuentasDeLaMesa(code);
    if (cuentas.size === 0) return;
    const origen = origenDe(request);
    const settlement = computeSettlement(state);

    await Promise.all(
      [...cuentas].map(async ([participantId, uid]) => {
        const saldo = settlement.byParticipant.find(
          (p) => p.participantId === participantId,
        );
        if (!saldo || saldo.settled) return;
        const email = await correoDe(uid);
        if (!email) return;
        const aQuien = settlement.transactions.find(
          (tx) => tx.fromId === participantId,
        );
        const acreedor = aQuien
          ? (state.participants.find((p) => p.id === aQuien.toId)?.name ?? null)
          : null;
        await mandaAviso(
          correoCierre({
            uid,
            email,
            origen,
            code,
            mesa: state.ticket.place,
            cents: Math.max(0, saldo.owesCents),
            aQuien: acreedor,
          }),
        );
      }),
    );
  } catch (fallo) {
    console.error("avisos: cierre", code, (fallo as Error).message);
  }
}

/** Alguien dice que ha pagado: a quien cobra, si tiene cuenta. */
export async function avisaPago(
  request: Request,
  code: string,
  state: TicketState,
  fromId: string,
  toId: string,
  cents: number,
): Promise<void> {
  if (!hayCorreo) return;
  try {
    const cuentas = await cuentasDeLaMesa(code);
    const uid = cuentas.get(toId);
    if (!uid) return;
    const email = await correoDe(uid);
    if (!email) return;
    const quien =
      state.participants.find((p) => p.id === fromId)?.name ?? "Alguien";
    await mandaAviso(
      correoPago({
        uid,
        email,
        origen: origenDe(request),
        code,
        mesa: state.ticket.place,
        quien,
        cents,
        de: fromId,
      }),
    );
  } catch (fallo) {
    console.error("avisos: pago", code, (fallo as Error).message);
  }
}
