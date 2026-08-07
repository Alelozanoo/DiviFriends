import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTicketState } from "@/lib/store";
import { money } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

/**
 * Lo que el bar imprime o enseña en pantalla: el ticket con su QR.
 * Pensado para papel de 80 mm, pero se ve bien en cualquier móvil.
 */
export default async function QrPage({ params }: Props) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const state = await getTicketState(code);
  if (!state) notFound();

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/t/${code}`;

  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#14100d", light: "#00000000" },
  });

  const { ticket, items } = state;
  const itemsTotal = items.reduce((a, i) => a + i.totalCents, 0);
  const extras = ticket.totalCents - itemsTotal;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/t/${code}`} className="stamp text-ink-faint hover:text-amber">
          ← Volver a la comanda
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto w-full max-w-[22rem] bg-[#f4ece0] px-7 pb-8 pt-7 text-[#14100d] shadow-2xl shadow-black/40">
        <header className="text-center">
          <h1 className="text-xl font-bold tracking-tight">{ticket.place ?? "Comanda"}</h1>
          {ticket.tableLabel && <p className="stamp mt-1 text-[#776a5c]">{ticket.tableLabel}</p>}
        </header>

        <div className="rule my-5 opacity-30" />

        <ul className="space-y-1.5 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline gap-3">
              <span className="tnum w-5 shrink-0 text-[#776a5c]">{item.qty}</span>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="tnum">{money(item.totalCents, ticket.currency)}</span>
            </li>
          ))}
        </ul>

        <div className="rule my-4 opacity-30" />

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

        <div className="mt-7 rounded-xl border border-dashed border-[#776a5c]/50 p-5 text-center">
          <p className="stamp text-[#776a5c]">Repartid la cuenta</p>
          <div
            className="mx-auto mt-3 h-40 w-40 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="tnum mt-3 text-lg font-bold tracking-[0.3em]">{code}</p>
          <p className="mt-1 text-xs text-[#776a5c]">
            Escanea o entra en divifriends y mete el código
          </p>
        </div>
      </article>

      <p className="no-print mt-6 text-center text-sm text-ink-faint">
        Enlace directo: <span className="tnum text-ink-soft">{url}</span>
      </p>
    </main>
  );
}

