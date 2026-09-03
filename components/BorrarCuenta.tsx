"use client";

import Link from "next/link";
import { useState } from "react";
import { useCuenta } from "@/lib/cuenta";
import { rellena, useT } from "@/lib/i18n";
import { CerrarHoja, Sheet } from "./ui";

/**
 * Borrar la cuenta, y sólo desde aquí.
 *
 * Estaba en el menú de la cuenta, en la misma pila de botones que «Editar mi
 * perfil» y «Cerrar la sesión», a un dedo de distancia de lo que se pulsa
 * todos los días. Un resbalón y no hay vuelta: no existe papelera. Así que se
 * ha ido a esta página, que es donde lo busca quien de verdad lo quiere, y en
 * el menú queda sólo una línea gris que lleva hasta aquí.
 *
 * Esconderlo tiene un límite legal: el RGPD da derecho a que te borren, y una
 * página enlazada desde el menú y desde el pie sigue estando a mano. Lo que no
 * puede es estar donde se pulsa sin querer.
 *
 * Y antes de borrar hay que escribir la palabra. No es ceremonia: es la única
 * forma de que la mano no vaya sola cuando el botón cae donde estaba el
 * anterior.
 */
export default function BorrarCuenta() {
  const t = useT();
  const { usuario, borrar } = useCuenta();
  const [abierta, setAbierta] = useState(false);
  const [palabra, setPalabra] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [fallo, setFallo] = useState(false);

  // Lo primero, porque borrar te deja sin sesión: si mirase antes al usuario,
  // el sitio del botón quedaría en blanco justo cuando hay algo que decir.
  if (hecho) {
    return <p className="mt-4 text-[15px] font-semibold text-mint">{t.cuenta.borrarHecho}</p>;
  }

  // Mientras Firebase decide si hay alguien, nada: enseñar «entra primero» y
  // cambiarlo medio segundo después es un parpadeo en una página que se lee.
  if (usuario === undefined) return null;

  if (usuario === null) {
    return <p className="mt-4 text-[14px] leading-relaxed text-ink-faint">{t.cuenta.borrarEntra}</p>;
  }

  const vale = palabra.trim().toUpperCase() === t.cuenta.borrarPalabra;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPalabra("");
          setFallo(false);
          setAbierta(true);
        }}
        className="mt-4 min-h-[52px] w-full rounded-pieza border border-clay/40 px-4 text-[15px] font-semibold text-clay transition-colors active:bg-clay/10"
      >
        {t.cuenta.borrar}
      </button>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
        {usuario.email ?? t.cuenta.titulo}
      </p>

      {abierta && (
        <Sheet onClose={() => setAbierta(false)} titulo={t.cuenta.borrarTitulo} sub={t.cuenta.borrarAviso}>
          <form
            className="mt-5 grid gap-2.5"
            onSubmit={async (evento) => {
              evento.preventDefault();
              if (!vale || borrando) return;
              setBorrando(true);
              setFallo(false);
              try {
                await borrar();
                setAbierta(false);
                setHecho(true);
              } catch {
                setFallo(true);
              } finally {
                setBorrando(false);
              }
            }}
          >
            <label className="block text-[13px] font-semibold text-ink-soft">
              {rellena(t.cuenta.borrarEscribe, { palabra: t.cuenta.borrarPalabra })}
            </label>
            <input
              value={palabra}
              onChange={(evento) => setPalabra(evento.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label={rellena(t.cuenta.borrarEscribe, { palabra: t.cuenta.borrarPalabra })}
              className="min-h-[52px] w-full rounded-pieza border border-line bg-paper px-4 text-[16px] font-semibold tracking-[0.08em] focus:border-clay focus:outline-none"
            />
            {fallo && (
              <p className="text-[13px] text-clay" role="alert">
                {t.cuenta.borrarFallo}
              </p>
            )}
            <button
              type="submit"
              disabled={!vale || borrando}
              className="min-h-[52px] rounded-pieza bg-clay text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {t.cuenta.borrarSi}
            </button>
            <CerrarHoja onClick={() => setAbierta(false)}>{t.cuenta.borrarNo}</CerrarHoja>
          </form>
        </Sheet>
      )}
    </>
  );
}

/** La línea gris del menú de la cuenta que trae hasta aquí. */
export function EnlaceBorrado({ onIr }: { onIr: () => void }) {
  const t = useT();
  return (
    <Link
      href="/privacidad#borrar"
      onClick={onIr}
      className="mt-1 block py-2 text-center text-[12.5px] text-ink-faint underline underline-offset-2 transition-colors active:text-ink-soft"
    >
      {t.cuenta.privacidad}
    </Link>
  );
}
