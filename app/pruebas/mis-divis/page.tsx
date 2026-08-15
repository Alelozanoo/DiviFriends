import type { Metadata } from "next";
import Link from "next/link";
import Banco from "./Banco";

/**
 * Banco de pruebas de «Tus divis», fuera de la portada.
 *
 * Está aquí para poder mirarlo, tocarlo y decidir si entra o no sin que nadie
 * se lo encuentre por sorpresa en la página principal. La app real ya guarda
 * los divis por los que pasas —eso sí está enchufado, porque si no no habría
 * nada que probar—, pero sólo se leen desde aquí.
 */
export const metadata: Metadata = {
  title: "Pruebas · Tus divis",
  robots: { index: false, follow: false, nocache: true },
};

export default function PruebaMisDivis() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link href="/" className="stamp text-ink-faint transition-colors hover:text-amber">
        ← Volver
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">Tus divis</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Prueba de la lista de comandas guardadas en este móvil. Todavía no está
        en la portada.
      </p>

      <Banco />
    </main>
  );
}
