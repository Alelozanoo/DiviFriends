import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE, idiomaDe } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n";
import PruebaComanda from "@/components/PruebaComanda";

/**
 * La comanda de las dos maneras, para elegir mirando.
 *
 * Página de usar y tirar: no está enlazada desde ningún sitio, no entra en el
 * mapa del sitio y lleva `noindex`. Cuando se decida, se borra.
 */
export const metadata: Metadata = {
  title: "Prueba · la comanda",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PruebaComandaPage() {
  const lang = idiomaDe((await cookies()).get(COOKIE)?.value);
  return (
    <I18nProvider lang={lang}>
      <main id="contenido" className="flex-1">
        <PruebaComanda />
      </main>
    </I18nProvider>
  );
}
