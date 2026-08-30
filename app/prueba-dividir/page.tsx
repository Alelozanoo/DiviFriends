import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE, idiomaDe } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n";
import PruebaDividir from "@/components/PruebaDividir";

/**
 * Maqueta de repartir un plato en una sola hoja. Sin enlazar, con `noindex` y
 * fuera del mapa del sitio: se borra en cuanto se decida.
 */
export const metadata: Metadata = {
  title: "Prueba · dividir",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PruebaDividirPage() {
  const lang = idiomaDe((await cookies()).get(COOKIE)?.value);
  return (
    <I18nProvider lang={lang}>
      <main id="contenido" className="flex-1">
        <PruebaDividir />
      </main>
    </I18nProvider>
  );
}
