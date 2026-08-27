import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { callerKey, consumeEnMemoria } from "@/lib/rateLimit";

/**
 * El portero de la API.
 *
 * Los topes que había vivían dentro de las dos rutas que llaman al modelo, que
 * son las que cuestan dinero de verdad por petición. Todo lo demás —leer una
 * comanda, apuntarse, marcar un plato— no tenía ninguno: cada llamada es una
 * lectura o una escritura de Firestore, y nadie puede pagar por otro lo que
 * cuesta pedirla un millón de veces.
 *
 * Va aquí y no repetido en cada `route.ts` porque olvidarse en una sola ruta
 * deja la puerta abierta entera, y porque las rutas nuevas quedan cubiertas sin
 * que nadie tenga que acordarse.
 *
 * En Next 16 esto se llama `proxy` —era `middleware`— y corre en Node, que es
 * lo que permite llevar la cuenta en memoria del propio proceso.
 */
export function proxy(request: NextRequest) {
  const decision = consumeEnMemoria(callerKey(request));
  if (decision.ok) return NextResponse.next();

  console.warn(`[limite] api · demasiadas seguidas · vuelve en ${decision.retryAfterSeconds}s`);
  return NextResponse.json(
    { error: "Demasiadas peticiones seguidas. Prueba otra vez en un momento." },
    {
      status: 429,
      headers: { "retry-after": String(Math.max(1, decision.retryAfterSeconds)) },
    },
  );
}

export const config = {
  matcher: "/api/:path*",
};
