import { money } from "@/lib/format";
import type { Item, Ticket } from "@/lib/types";

/**
 * El ticket tal y como estaba impreso: líneas, cantidades, importes y total.
 *
 * Es la referencia contra la que se discute («¿seguro que pedimos dos?»), así
 * que se parece a un ticket de papel a propósito: mismo tono crema, misma
 * tipografía de máquina, mismo orden. Lo usan la pantalla de imprimir y la
 * hoja de «ver ticket» de la comanda, y por eso el QR entra por `children`:
 * en el móvil no pinta nada.
 */
export default function PaperTicket({
  ticket,
  items,
  children,
}: {
  ticket: Ticket;
  items: Item[];
  children?: React.ReactNode;
}) {
  const itemsTotal = items.reduce((a, i) => a + i.totalCents, 0);
  const extras = ticket.totalCents - itemsTotal;

  return (
    <article className="mx-auto w-full max-w-[22rem] bg-[#f4ece0] px-7 pb-8 pt-7 text-[#14100d]">
      <header className="text-center">
        <h1 className="text-xl font-bold tracking-tight">{ticket.place ?? "Comanda"}</h1>
        {ticket.tableLabel && <p className="stamp mt-1 text-[#776a5c]">{ticket.tableLabel}</p>}
      </header>

      <div className="rule my-5 opacity-30" />

      {items.length === 0 ? (
        <p className="py-2 text-center text-sm text-[#776a5c]">No queda ninguna línea.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline gap-3">
              <span className="tnum w-5 shrink-0 text-[#776a5c]">{item.qty}</span>
              <span className="min-w-0 flex-1">{item.name}</span>
              <span className="tnum shrink-0">{money(item.totalCents, ticket.currency)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="rule my-4 opacity-30" />

      {/* Lo que el ticket cobra por encima de las líneas: servicio, impuestos… */}
      {extras !== 0 && (
        <div className="flex items-baseline justify-between text-sm text-[#776a5c]">
          <span className="stamp">{extras > 0 ? "Servicio / imp." : "Descuento"}</span>
          <span className="tnum">{money(extras, ticket.currency)}</span>
        </div>
      )}

      <div className="mt-2 flex items-baseline justify-between">
        <span className="stamp font-bold">Total</span>
        <span className="tnum text-2xl font-bold">{money(ticket.totalCents, ticket.currency)}</span>
      </div>

      {children}
    </article>
  );
}
