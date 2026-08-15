import type { Metadata } from "next";
import Landing from "@/components/Landing";

/**
 * El par de idiomas, declarado también desde aquí.
 *
 * `hreflang` tiene que ser recíproco: si sólo lo declara `/en`, Google puede
 * descartar la anotación entera y tratar las dos como páginas sueltas —o peor,
 * como contenido duplicado. Va en la página y no en el layout porque el layout
 * lo comparten las comandas, que no tienen versión inglesa que anunciar.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { es: "/", en: "/en" } },
};

/** La portada en español. La inglesa vive en `/en` y comparte todo menos el idioma. */
export default function Home() {
  return <Landing lang="es" />;
}
