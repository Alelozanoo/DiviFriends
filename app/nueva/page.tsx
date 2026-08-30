import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE, idiomaDe, inicio } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n";
import ManualTicketForm from "@/components/ManualTicketForm";

// La marca la pone la plantilla del layout.
export const metadata: Metadata = {
  title: "Nueva comanda",
};

type Props = { searchParams: Promise<{ demo?: string }> };

export default async function NuevaPage({ searchParams }: Props) {
  const { demo } = await searchParams;
  const lang = idiomaDe((await cookies()).get(COOKIE)?.value);
  const ingles = lang === "en";

  return (
    <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      {/* La marca lleva sus colores fijos, así que `hover:text-amber` ya no
          teñía nada: la respuesta al pasar por encima va en la opacidad. */}
   <Link href={inicio(lang)} className="text-[12px] text-ink-faint transition-opacity hover:opacity-75">
        ← <Wordmark />
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {ingles ? "New bill" : "Nueva comanda"}
      </h1>
      <p className="mt-3 text-ink-soft">
        {ingles
          ? "Write down what's on the table. When you save it you get the QR and the code, so everyone can split the bill from their own phone."
          : "Apunta lo que hay en la mesa. Al guardar obtienes el QR y el código para que los comensales se repartan la cuenta desde su móvil."}
      </p>

      <div className="mt-8">
        <I18nProvider lang={lang}>
          <ManualTicketForm demo={demo === "1"} />
        </I18nProvider>
      </div>
    </main>
  );
}
