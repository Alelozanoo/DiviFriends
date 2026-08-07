import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicketState } from "@/lib/store";
import { ticketQrSvg, ticketUrl } from "@/lib/ticketUrl";
import PaperTicket from "@/components/PaperTicket";
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

  const url = await ticketUrl(code);
  const svg = await ticketQrSvg(url);


  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/t/${code}`} className="stamp text-ink-faint hover:text-amber">
          ← Volver a la comanda
        </Link>
        <PrintButton />
      </div>

      <div className="shadow-2xl shadow-black/40">
        <PaperTicket ticket={state.ticket} items={state.items}>
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
        </PaperTicket>
      </div>

      <p className="no-print mt-6 text-center text-sm text-ink-faint">
        Enlace directo: <span className="tnum text-ink-soft">{url}</span>
      </p>
    </main>
  );
}

