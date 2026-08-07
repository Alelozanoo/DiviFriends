import Link from "next/link";
import type { Metadata } from "next";
import { getTicketState } from "@/lib/store";
import SplitApp from "@/components/SplitApp";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const state = await getTicketState(code.toUpperCase());
  return {
    title: state?.ticket.place
      ? `${state.ticket.place} · repartir la cuenta`
      : "Repartir la cuenta · DiviFriends",
  };
}

export default async function TicketPage({ params }: Props) {
  const { code } = await params;
  const state = await getTicketState(code.toUpperCase());

  if (!state) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col justify-center px-6 py-20 text-center">
        <p className="stamp text-ink-faint">Código {code.toUpperCase()}</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Esta comanda no existe</h1>
        <p className="mt-3 text-ink-soft">
          Puede que el código esté mal escrito o que la comanda ya se haya borrado.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-xl bg-amber px-5 py-3 font-semibold text-paper transition-colors hover:bg-ink"
        >
          Volver al inicio
        </Link>
      </main>
    );
  }

  return <SplitApp initial={state} />;
}
