import type { Metadata } from "next";
import Landing from "@/components/Landing";

/**
 * La misma portada en inglés, con su propia URL.
 *
 * Con URL propia y no con una cookie: así se sirve estática igual que la
 * española —sin parpadeo y sin pedirle nada al servidor— y los buscadores
 * pueden indexar las dos. `alternates` es lo que les dice que son la misma
 * página en dos idiomas y no contenido duplicado.
 */
export const metadata: Metadata = {
  title: "DiviFriends · Split the bill without arguing",
  description:
    "Snap a photo of the receipt, tap what you had, and see who owes what. Several receipts, several payers, one bill.",
  alternates: { canonical: "/en", languages: { es: "/", en: "/en" } },
};

export default function HomeEn() {
  return <Landing lang="en" />;
}
