"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import iphone from "@/assets/portada-iphone.webp";
import Logo, { Wordmark } from "@/components/Logo";
import TicketUploader from "@/components/TicketUploader";
import { CambiarCookies } from "@/components/Consent";
import { PASOS } from "@/components/ComoVa";
import Preguntas from "@/components/Preguntas";
import MisDivisBoton from "@/components/MisDivis";
import ComoFuncionaSheet from "@/components/ComoFuncionaSheet";
import LangSwitch from "@/components/LangSwitch";
import CuentaBoton from "@/components/CuentaBoton";
import RegistroSheet from "@/components/RegistroSheet";
import Inicio from "@/components/Inicio";
import Admin from "@/components/Admin";
import { RESPONSABLE } from "@/lib/responsable";
import { useCuenta } from "@/lib/cuenta";
import { useSesionLocal } from "@/lib/sesionLocal";
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
  const { usuario, cargada, usuarioNombre } = useCuenta();
  const sesion = useSesionLocal();
  const router = useRouter();
  // La cuenta de la casa ve el panel; «Ver mis mesas» la pasa a lo de todos.
  const admin = usuario?.email?.toLowerCase() === RESPONSABLE.correo;
  const [comoUsuario, setComoUsuario] = useState(false);

  /*
    Con cuenta pero sin haber pasado por el registro —foto, usuario, cómo te
    pagan— se va allí antes que a ninguna otra parte. La casa no se registra:
    no es una usuaria.

    Lo que se mira es el usuario y no los términos, que es lo que se miraba
    antes: desde el 6 de septiembre de 2026 los términos se aceptan al entrar
    con Google, así que los tiene todo el mundo y esta puerta no se habría
    abierto nunca más. El usuario es lo único de esa página que no se puede
    rellenar solo.
  */
  useEffect(() => {
    if (usuario && cargada && !usuarioNombre && !admin) router.replace("/registro");
  }, [usuario, cargada, usuarioNombre, admin, router]);

  /*
    Con cuenta, la portada es otra: tus mesas, no la web de venta.

    El servidor pinta siempre la de venta —`/` es estática y no sabe quién
    llega— y en cuanto Firebase dice que hay sesión, se cambia. Firebase tarda
    entre uno y tres segundos en decirlo, y ese rato quien tiene cuenta veía
    la web de venta y luego un salto: le parecía que la app no sabía quién
    era. Por eso se mira antes la huella que dejó la última sesión en el
    móvil (`lib/sesionLocal.ts`): si la hay, se enseñan sus mesas desde el
    primer fotograma —están guardadas aquí mismo— y Firebase confirma por
    detrás. Si al final dice que no hay nadie, la huella se borra y vuelve la
    de venta. La casa espera en blanco: su portada es el panel, no las mesas.
  */
  if (usuario === undefined && sesion) {
    return (
      <main id="contenido" className="flex flex-1 flex-col">
        {sesion === "casa" ? null : <Inicio />}
      </main>
    );
  }

  if (usuario) {
    return (
      <main id="contenido" className="flex flex-1 flex-col">
        {admin && !comoUsuario ? <Admin onComoUsuario={() => setComoUsuario(true)} /> : <Inicio />}
      </main>
    );
  }

  return (
    /* `data-portada`: el CSS la esconde antes de hidratar si hay huella de sesión. */
    <main id="contenido" data-portada="venta" className="flex flex-1 flex-col lg:block">
      {/* ---------------------------------------------------------------- hero */}
      {/*
        En el móvil, una sola pantalla y sin scroll.

        La portada del móvil se rehizo el 3 de septiembre de 2026 después de
        dos versiones que él llamó «muy IA»: el papel crema con dos botones y
        un visor de cámara dibujado. Lo que quedó es lo contrario de un
        decorado: el titular, la captura real de la comanda desvaneciéndose
        por abajo, y el botón. Nada dibujado, nada que imite un ticket.

        Todo cabe en la primera pantalla porque la sección se estira hasta
        el pie y la captura ocupa lo que sobra: en un iPhone pequeño se ve
        menos comanda; en uno grande, más. Lo que nunca cambia de sitio es el
        botón, que va donde llega el pulgar.
      */}
      <section className="relative flex flex-1 flex-col overflow-hidden lg:block">
        {/* El halo ámbar sólo en el escritorio: en el móvil la captura ya
            pone la luz, y un degradado detrás de un titular es justo lo que
            hace que una portada parezca generada. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 hidden h-[38rem] w-[38rem] -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl lg:block"
          style={{ background: "radial-gradient(circle, var(--amber), transparent 65%)" }}
        />

        <div className="mx-auto w-full max-w-6xl px-[var(--gutter)] pt-7 lg:px-5 lg:pb-20 lg:pt-16">
          {/*
            La marca, más pequeña de lo que era.

            En el móvil el logo iba a 40 px y la palabra a 24, y el reclamo
            —que es lo único que tiene que convencer a alguien que llega de un
            enlace— a 21. O sea que lo más grande de la pantalla era el nombre
            de la empresa, que es justo lo que menos le importa a quien acaba
            de llegar. Aquí la marca dice quién eres; el reclamo, para qué
            sirve. Y ese orden se ve antes de leer nada.
          */}
          <header className="mb-5 flex items-center justify-between lg:mb-12">
            <Link href={inicio(lang)} className="inline-flex items-center gap-2.5 lg:gap-4">
              <Logo size={128} priority className="h-8 w-8 lg:h-20 lg:w-20" />
              <Wordmark className="text-[19px] font-bold tracking-[-0.03em] lg:text-3xl" />
            </Link>
            {/*
              Sin `transform` en este envoltorio, y no es manía: una
              transformación en un antecesor convierte el `position: fixed` de
              las hojas en «fijo respecto a este div», y la hoja de la cuenta
              salía como una tira de noventa píxeles pegada a la derecha. Se
              centra en vertical con flex, que no crea ese problema.
            */}
            {/* Tus divis y tu cuenta, juntas y del mismo tamaño: las dos son
                «lo tuyo», y separarlas haría que una pareciera más importante. */}
            <div className="flex items-center gap-0.5">
              <MisDivisBoton />
              <CuentaBoton />
            </div>
          </header>

          {/*
            El titular del móvil: centrado, corto y en peso medio.

            No es el del escritorio. Allí hay sitio para una frase larga y un
            párrafo; aquí cabe una idea y media línea debajo, y el ojo tiene
            que irse enseguida a la captura. En peso medio y no en negrita
            porque lo que grita en esta pantalla es el botón, no el texto.
          */}
          <div className="lg:hidden">
            <p className="mx-auto max-w-[22ch] text-balance text-center text-[29px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
              {t.home.claimMovil}
            </p>
            <p className="mx-auto mt-2.5 max-w-[34ch] text-balance text-center text-[15px] leading-[1.45] text-ink-soft">
              {t.home.entradillaMovil}
            </p>
          </div>

          {/*
            El escritorio, con lo mismo que el móvil.

            El papel crema con los dos botones se fue del móvil el 3 de
            septiembre de 2026 por parecer un ticket de mentira, y en el
            ordenador seguía. Ahora es lo mismo a lo ancho: el titular y el
            párrafo a la izquierda con el botón y el enlace del código
            debajo, y a la derecha la comanda de verdad dentro de un móvil.
            El papel se queda sólo donde hay un ticket de verdad: dentro de la
            mesa, al añadir uno. Se oculta por CSS y no se borra, así que
            sigue en el HTML para los buscadores.
          */}
          <div className="hidden lg:flex lg:flex-row lg:items-center lg:gap-20">
            <div className="flex-1">
              <h1 className="text-[2.6rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                {t.home.tituloLargo}
                <br />
                <span className="text-amber">{t.home.tituloLargoAmber}</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                {t.home.entradilla}
              </p>

              {/* Los sellos («Gratis · Sin registro · Sin instalar») los
                  pinta la propia variante, en una línea y sin píldoras. */}
              <div className="mt-8 max-w-sm">
                <TicketUploader variante="aire" />
              </div>
            </div>

            {/* El iPhone de verdad, recortado sin fondo, con la comanda dentro:
                nada dibujado con CSS. Más pequeño que a tamaño natural y
                desvaneciéndose desde la mitad, como en el móvil: entero
                ocupaba la pantalla del ordenador de arriba abajo. */}
            <div
              className="relative h-[500px] w-[290px] shrink-0 overflow-hidden"
              style={{
                maskImage: "linear-gradient(to bottom, #000 48%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 48%, transparent 100%)",
              }}
            >
              <Image src={iphone} alt={t.home.capturaAlt} priority sizes="290px" className="w-[290px] max-w-none" />
            </div>
          </div>
        </div>

        {/*
          La comanda de verdad, dentro de un iPhone que no termina.

          Es una captura real de la app, con las letras nuevas, dentro del
          iPhone recortado sin fondo que vive en el motor de los reels
          (`reel-motor/motor/moviles`, ver su `moviles.md`): él rechazó el
          móvil dibujado con CSS. Todo el bloque se desvanece por abajo con
          una máscara, así que la comanda parece seguir por debajo del botón
          en vez de cortarse contra él.

          Ocupa lo que sobra entre el texto y el botón, con un mínimo para
          que en un móvil pequeño siga viéndose la cabecera de la comanda y la
          primera línea marcada.

          La captura se importa y no se sirve desde `public/`, y no es por
          gusto: la primera versión iba en `public/` y en
          App Hosting salía un 404 —igual que `public/logos/*`, que llevaba
          desde agosto sin servirse y nadie lo había notado— mientras el
          logo de al lado, de agosto, sí. Importada, Next la empaqueta en
          `/_next/static/media/` con un hash, por el mismo camino que el
          JavaScript, y ese camino sí llega.
        */}
        <div
          className="relative mt-5 min-h-[170px] flex-1 overflow-hidden lg:hidden"
          style={{
            maskImage: "linear-gradient(to bottom, #000 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 40%, transparent 100%)",
          }}
        >
          <Image
            src={iphone}
            alt={t.home.capturaAlt}
            priority
            sizes="270px"
            className="absolute left-1/2 top-0 w-[270px] max-w-none -translate-x-1/2"
          />
        </div>

        {/* Las acciones del móvil: el botón ámbar y el enlace del código.
            Sin papel: la variante «aire» de `TicketUploader`. */}
        <div className="px-[var(--gutter)] pb-3 pt-4 lg:hidden">
          <TicketUploader variante="aire" />
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
        El pie, en una sola línea en el móvil.

        Para que la portada quepa en la pantalla sin scroll, el pie del móvil
        se queda con los enlaces y pierde el lema, que ya está dicho arriba.
        En pantalla ancha sí hay sitio para las dos puntas, y ahí se queda como
        estaba.
      */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-[var(--gutter)] py-2 text-[13px] text-ink-faint sm:flex-row sm:justify-between sm:gap-4 sm:px-5 sm:py-8">
          <p className="hidden text-center sm:block sm:text-left">
            <Wordmark className="font-semibold" /> · {t.home.pieLema}
          </p>
          {/* Con hueco para el dedo: los tres enlaces del pie median 20 px de
              alto, la mitad de lo que hace falta para acertar sin mirar. */}
          <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0 [&_a]:py-2 [&_button]:py-2">
            <LangSwitch enPortada />
            <ComoFuncionaSheet />
            <Link
              href="/privacidad"
              className="underline underline-offset-2 transition-colors hover:text-amber"
            >
              {t.cookies.privacidad}
            </Link>
            <Link
              href="/aviso-legal"
              className="underline underline-offset-2 transition-colors hover:text-amber"
            >
              {t.cookies.avisoLegal}
            </Link>
            <CambiarCookies className="underline underline-offset-2 transition-colors hover:text-amber" />
          </span>
        </div>
      </footer>

      {/* Sin sesión, lo primero que se ve: «Continuar con Google» o «Ahora no». */}
      <RegistroSheet />
    </main>
  );
}
