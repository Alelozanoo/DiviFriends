"use client";

import Link from "next/link";
import Logo, { Wordmark } from "@/components/Logo";
import TicketUploader from "@/components/TicketUploader";
import { CambiarCookies } from "@/components/Consent";
import { PASOS } from "@/components/ComoVa";
import Preguntas from "@/components/Preguntas";
import MisDivis from "@/components/MisDivis";
import ComoFuncionaSheet from "@/components/ComoFuncionaSheet";
import LangSwitch from "@/components/LangSwitch";
import { I18nProvider, useT, useLang, type Lang } from "@/lib/i18n";
import { inicio } from "@/lib/i18n/config";

/**
 * La portada, en el idioma que le digan.
 *
 * Vive aquí y no en la ruta porque hay dos rutas que la pintan: `/` en español
 * y `/en` en inglés. Las dos son estáticas —el idioma lo decide la URL, no una
 * cookie—, así que cada una se sirve ya hecha y sin parpadeo, y los buscadores
 * ven dos páginas de verdad en vez de una que cambia sola.
 */
export default function Landing({ lang }: { lang: Lang }) {
  return (
    <I18nProvider lang={lang}>
      <Cuerpo />
    </I18nProvider>
  );
}

function Cuerpo() {
  const t = useT();
  const lang = useLang();
  return (
    <main id="contenido" className="flex flex-1 flex-col lg:block">
      {/* ---------------------------------------------------------------- hero */}
      {/* En el móvil se estira para que el pie caiga abajo del todo, y lo de
          dentro va centrado: a quien entra por primera vez, sin divis guardados,
          le sobraban cuatro dedos de negro entre la tarjeta y el pie. Centrado,
          ese aire se reparte arriba y abajo y deja de parecer un hueco. */}
      <section className="relative flex flex-1 flex-col justify-center overflow-hidden lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--amber), transparent 65%)" }}
        />

        <div className="mx-auto max-w-6xl px-[var(--gutter)] pb-8 pt-8 lg:px-5 lg:pb-20 lg:pt-16">
          <header className="mb-6 flex justify-center lg:mb-12 lg:justify-start">
            <Link href={inicio(lang)} className="inline-flex items-center gap-3 lg:gap-4">
              <Logo size={128} priority className="h-10 w-10 lg:h-20 lg:w-20" />
              <Wordmark className="text-[24px] font-bold tracking-[-0.03em] lg:text-3xl" />
            </Link>
          </header>

          {/*
            El reclamo, sólo en el móvil. El titular grande y el párrafo se
            quedan para el ordenador, pero sin nada la pantalla no decía qué es
            esto: era una tarjeta suelta en un hueco negro.
          */}
          <p className="mb-5 text-center text-[21px] font-bold leading-tight tracking-[-0.025em] text-ink lg:hidden">
            {t.home.claim} <span className="text-amber">{t.home.claimAmber}</span>
          </p>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
            <div className="order-1 w-full lg:order-2 lg:max-w-md">
              {/*
                Una sola caja.

                Había tres metidas una dentro de otra —la tarjeta, el recuadro
                de puntos y el fondo de dentro—, cada una con su borde y su
                radio, y el ojo no sabía cuál era el sitio donde se toca. Ahora
                el rótulo va fuera, como el sello de una sección, y debajo hay
                un solo bloque con las dos maneras de empezar.
              */}
              <p className="stamp mb-2.5 text-ink-faint lg:px-2">{t.home.empiezaAqui}</p>
              <TicketUploader />

              {/*
                Debajo de la tarjeta y no encima: quien vuelve baja el pulgar un
                centímetro y ya está, y quien llega por primera vez no se
                encuentra un muro antes de poder hacer la foto — que costó lo
                suyo que entrara en la primera pantalla.

                No pinta nada si no hay divis guardados, así que para quien
                llega nuevo la portada es exactamente la de antes.
              */}
              <MisDivis />

              {/*
                Los cuatro pasos, en corto y sólo en el móvil.

                Debajo de la tarjeta quedaba un palmo de negro hasta el pie:
                centrar el bloque lo repartía arriba y abajo, pero seguía siendo
                hueco. Aquí van los titulares de los cuatro pasos, sin los
                dibujos —que son de ordenador y pesan— y con los filetes de la
                comanda entre uno y otro, así que se lee como lo que es: la
                lista de un ticket.
              */}
              <div className="mt-7 lg:hidden">
                <p className="stamp text-ink-faint">{t.pasos.titulo}</p>
                <ol className="mt-2.5 grid">
                  {t.pasos.resumen.map((paso, i) => (
                    <li key={paso}>
                      {i > 0 && <div className="rule" />}
                      <p className="flex items-baseline gap-3 py-2.5">
                        <span className="tnum shrink-0 text-[13px] font-bold text-amber">
                          {i + 1}
                        </span>
                        <span className="text-[15px] font-semibold leading-snug">{paso}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/*
              En el móvil esto no se ve.

              Quien entra desde el teléfono viene a repartir una cuenta, no a
              leer de qué va: el titular, el párrafo y los sellos le empujaban
              la app fuera de la pantalla. Se oculta por CSS y no se borra, así
              que sigue en el HTML para los buscadores —que indexan con
              navegador móvil— y para quien abra la web en un ordenador.
            */}
            <div className="hidden flex-1 lg:block order-2 lg:order-1">
              <h1 className="text-[2.6rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                {t.home.tituloLargo}
                <br />
                <span className="text-amber">{t.home.tituloLargoAmber}</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                {t.home.entradilla}
              </p>

              <ul className="mt-6 flex flex-wrap justify-start gap-1.5 lg:mt-8 lg:gap-2">
                {t.home.sellos.map((texto) => (
                  <li
                    key={texto}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-paper-2/70 py-1.5 pl-2.5 pr-3 text-xs font-semibold text-ink-soft lg:py-2 lg:pl-3 lg:pr-4 lg:text-sm"
                  >
                    <CheckIcon />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- proceso */}
      {/* Igual que el texto del hero: escondido en el móvil, intacto en el
          HTML. Es casi todo lo que esta web tiene para posicionar. */}
      <section className="hidden border-y border-line bg-paper-2/40 lg:block">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.pasos.titulo}</h2>
          <p className="mt-3 max-w-md text-ink-soft">{t.pasos.entradilla}</p>

          {/* Al dibujarlas son bajitas, así que caben apiladas en el móvil sin
              carrusel ni scroll lateral: se leen de arriba abajo, en orden. */}
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {PASOS(t).map(({ n, title, foot, Pieza }) => (
              <li key={n} className="flex flex-col">
                <div>
                  <p className="flex items-baseline gap-2.5">
                    <span className="tnum text-sm font-bold text-amber">{n}</span>
                    <span className="text-lg font-semibold tracking-tight">{title}</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{foot}</p>
                </div>
                <div className="mt-4 flex-1">
                  <Pieza />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="hidden lg:block">
        <Preguntas />
      </div>

      {/*
        En el móvil el pie va centrado y en dos líneas cortas. Antes tenía la
        marca pegada a la izquierda y el enlace de cookies suelto a la derecha,
        a otra altura y con la frase de en medio partiéndose en dos: la raya de
        arriba cruzaba entera y debajo no había nada alineado con nada.

        En pantalla ancha sí hay sitio para las dos puntas, y ahí se queda como
        estaba.
      */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-[var(--gutter)] py-6 text-[13px] text-ink-faint sm:flex-row sm:justify-between sm:gap-4 sm:px-5 sm:py-8">
          <p className="text-center sm:text-left">
            <Wordmark className="font-semibold" /> · {t.home.pieLema}
          </p>
          {/* Con hueco para el dedo: los tres enlaces del pie median 20 px de
              alto, la mitad de lo que hace falta para acertar sin mirar. */}
          <span className="flex items-center gap-4 [&_a]:py-2 [&_button]:py-2">
            <LangSwitch enPortada />
            <ComoFuncionaSheet />
            <Link
              href="/privacidad"
              className="underline underline-offset-2 transition-colors hover:text-amber"
            >
              {t.cookies.privacidad}
            </Link>
            <CambiarCookies className="underline underline-offset-2 transition-colors hover:text-amber" />
          </span>
        </div>
      </footer>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--mint)"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  );
}
