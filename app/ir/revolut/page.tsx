import Link from "next/link";
import type { Metadata } from "next";
import { conceptoDe, enlaceRevolut, limpiaRevolut } from "@/lib/cobro";
import Salto from "./Salto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abriendo Revolut",
  robots: { index: false, follow: false },
};

/**
 * La pantalla de paso hacia Revolut.
 *
 * Existe por una regla de iOS: un enlace a revolut.me tocado desde otra web se
 * lleva a la app de Revolut si la tienes instalada, y ahí pagar cuesta más —si
 * no llevas saldo hay que recargar primero—. Su web, en cambio, ofrece Apple
 * Pay y tarjeta de un toque. Como el traspaso a la app sólo ocurre cuando hay
 * un gesto de por medio, aquí se toca un enlace de nuestro dominio y la URL de
 * Revolut la pone el navegador solo, ya sin gesto.
 *
 * El destino se arma aquí y no se acepta de fuera. Un `?url=` que redirigiese a
 * donde le dijeran convertiría esto en un salto abierto: cualquiera podría
 * mandar «divifriends.es/ir/…» a una web de phishing y llevaría nuestro nombre
 * delante. Sólo entran los datos, y el único destino posible es revolut.me.
 */
type Props = {
  searchParams: Promise<{ u?: string; c?: string; m?: string; n?: string }>;
};

export default async function IrARevolut({ searchParams }: Props) {
  const { u, c, m, n } = await searchParams;

  const usuario = limpiaRevolut(u ?? "");
  const cents = Number.parseInt(c ?? "", 10);

  if (!usuario || !Number.isFinite(cents) || cents <= 0) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-[var(--gutter)] py-20 text-center">
        <p className="text-[21px] font-bold leading-tight tracking-[-0.025em]">
          Este enlace de pago no vale
        </p>
        <p className="text-[13px] leading-relaxed text-ink-faint">
          Vuelve a la comanda y toca otra vez el botón de pagar.
        </p>
        <Link
          href="/"
          className="min-h-[46px] rounded-xl border border-line px-5 py-3 text-[15px] font-semibold text-ink"
        >
          Ir al inicio
        </Link>
      </main>
    );
  }

  /* La nota llega hecha desde la comanda; si falta, se arma con lo que haya
     para que el concepto nunca viaje vacío. */
  const nota = (n ?? "").trim() || conceptoDe(null);

  return <Salto destino={enlaceRevolut(usuario, cents, m ?? "EUR", nota)} />;
}
