import Link from "next/link";
import type { Metadata } from "next";
import ManualTicketForm from "@/components/ManualTicketForm";

// La marca la pone la plantilla del layout.
export const metadata: Metadata = {
  title: "Nueva comanda",
};

type Props = { searchParams: Promise<{ demo?: string }> };

export default async function NuevaPage({ searchParams }: Props) {
  const { demo } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href="/" className="stamp text-ink-faint hover:text-amber">
        ← DiviFriends
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Nueva comanda</h1>
      <p className="mt-3 text-ink-soft">
        Apunta lo que hay en la mesa. Al guardar obtienes el QR y el código para que los comensales
        se repartan la cuenta desde su móvil.
      </p>

      <div className="mt-8">
        <ManualTicketForm demo={demo === "1"} />
      </div>
    </main>
  );
}
