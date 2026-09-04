import type { Metadata } from "next";
import { cookies } from "next/headers";
import Registro from "@/components/Registro";
import { I18nProvider } from "@/lib/i18n";
import { COOKIE, idiomaDe } from "@/lib/i18n/config";

/** La primera pantalla con cuenta: foto, usuario, cómo te pagan y los términos. */
export const metadata: Metadata = {
  title: "Tu cuenta",
  // Es de quien acaba de entrar; a Google no le dice nada.
  robots: { index: false, follow: false },
};

export default async function RegistroPage() {
  const lang = idiomaDe((await cookies()).get(COOKIE)?.value);
  return (
    <I18nProvider lang={lang}>
      <Registro />
    </I18nProvider>
  );
}
