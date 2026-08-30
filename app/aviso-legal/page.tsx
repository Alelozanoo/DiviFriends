import Link from "next/link";
import type { Metadata } from "next";
import { RESPONSABLE } from "@/lib/responsable";

/**
 * El aviso legal y las condiciones de uso.
 *
 * Van juntos en una página a propósito: son cuatro cosas —quién está detrás,
 * qué es esto, qué no promete y qué se espera de quien lo usa—, y partirlas en
 * dos páginas de mil palabras es la forma más segura de que no las lea nadie.
 *
 * Lo que de verdad protege aquí no es una cláusula: es que esté escrito que la
 * app calcula y no cobra, que el papel manda sobre lo que lea el modelo, y que
 * el enlace de una mesa es su llave. Todo lo demás es formulario.
 */

const ACTUALIZADA = "27 de agosto de 2026";

export const metadata: Metadata = {
  title: "Aviso legal",
  description:
    "Quién está detrás de DiviFriends, qué hace la app y qué no promete. En castellano y sin letra pequeña.",
  robots: { index: true, follow: true },
};

export default function AvisoLegalPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-[var(--gutter)] py-12">
      <h1 className="text-[27px] font-bold leading-tight tracking-[-0.03em]">Aviso legal</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Quién está detrás de esto, qué hace la app y qué no promete. Lo de los datos va{" "}
        <Link href="/privacidad" className="text-amber underline underline-offset-2">
          en su propia página
        </Link>
        .
      </p>

      <Bloque titulo="Quién responde">
        <Dato k="Titular">{RESPONSABLE.nombre}</Dato>
        <Dato k="NIF">{RESPONSABLE.nif}</Dato>
        <Dato k="Correo">
          <a
            href={`mailto:${RESPONSABLE.correo}`}
            className="text-amber underline underline-offset-2"
          >
            {RESPONSABLE.correo}
          </a>
        </Dato>
        <Dato k="Servicio">{RESPONSABLE.sitio}</Dato>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
          DiviFriends es gratis: no se cobra por usarla, no hay anuncios ni publicidad de
          terceros, y no se vende nada a nadie. Para cualquier cosa —una duda, una queja, borrar
          una mesa— el correo de arriba es el sitio.
        </p>
      </Bloque>

      <Bloque titulo="Qué es esto">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Una calculadora para repartir la cuenta de un bar. Le haces una foto al ticket, la app
          lo lee, cada uno marca lo suyo y sale quién le debe cuánto a quien puso la tarjeta.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          <b className="text-ink">DiviFriends no toca el dinero en ningún momento.</b> No cobra,
          no retiene, no adelanta y no transfiere. Cuando pulsas «pagar», lo único que hace es
          abrir tu app con el importe y el concepto ya escritos: el pago ocurre entre tu banco y
          el suyo, y a eso se aplican sus condiciones, no las de aquí.
        </p>
      </Bloque>

      <Bloque titulo="Lo que no puede prometer" tono="aviso">
        <Dato k="La lectura del ticket">
          La hace un modelo de inteligencia artificial y{" "}
          <b className="text-ink">se equivoca</b>: un precio borroso, una línea partida, un total
          que no cuadra. Lo que manda es el papel. Antes de que nadie pague, comprobad los
          números — se editan desde la propia comanda.
        </Dato>
        <Dato k="Las cuentas">
          Salen de lo que cada uno marca. Si alguien no marca lo que se ha comido, o marca de
          más, el reparto será fiel a lo marcado y no a lo que pasó en la mesa. Eso lo arregla la
          mesa, no la app.
        </Dato>
        <Dato k="Que esté siempre">
          Es un servicio gratuito y puede caerse, cambiar o dejar de existir. No cuentes con él
          para nada que no sea repartir una cuenta esta noche.
        </Dato>
        <Dato k="Las deudas">
          Que la app diga que alguien te debe 12 € no crea ninguna obligación entre vosotros ni
          convierte a nadie en parte de vuestro acuerdo. Es una cuenta, no un contrato.
        </Dato>
      </Bloque>

      <Bloque titulo="La mesa es de quien tiene el enlace" tono="aviso">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          No hay cuentas ni contraseñas: <b className="text-ink">el enlace es la llave</b>.
          Cualquiera que lo tenga puede ver la comanda, apuntarse, marcar platos y cambiar lo que
          hay dentro — también el móvil al que la mesa hace el Bizum. Los cambios de cobro
          quedan escritos en el historial para que se vean.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Así que compártelo con tu mesa y no más allá, y no metas ahí nada que no quieras que
          vea quien reenvíe ese enlace.
        </p>
      </Bloque>

      <Bloque titulo="Qué se espera de ti">
        <ul className="grid gap-2">
          <Punto>
            Sube tickets tuyos. No subas documentos de otros, ni papeles con datos de nadie que
            no sean consumiciones.
          </Punto>
          <Punto>
            Escribe nombres, no datos ajenos. El de la mesa puede ser un apodo: nadie comprueba
            nada.
          </Punto>
          <Punto>
            No la uses para nada ilegal, ni para molestar a nadie, ni para hacerte pasar por
            otro y cobrar en su lugar.
          </Punto>
          <Punto>
            No ataques el servicio: nada de automatizar peticiones en masa, colarse por donde no
            hay puerta ni intentar tirarlo. Hay topes puestos y se aplican.
          </Punto>
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
          Si alguien usa la app para algo de esto, se le puede cortar el acceso y borrar lo que
          haya subido, sin aviso.
        </p>
      </Bloque>

      <Bloque titulo="Lo que es de cada uno">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          El nombre DiviFriends, el diseño y el código son míos. Lo que escribes tú —el nombre de
          tu mesa, tu foto, lo que marcas— sigue siendo tuyo; sólo se guarda para que la app
          funcione, y se borra solo a los 30 días como cuenta la{" "}
          <Link href="/privacidad" className="text-amber underline underline-offset-2">
            página de privacidad
          </Link>
          .
        </p>
      </Bloque>

      <Bloque titulo="Qué ley y qué juzgados">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Se aplica la legislación española. Si eres consumidor, esto no te quita ni un derecho
          de los que ya tienes, y puedes reclamar ante los juzgados de tu domicilio.
        </p>
      </Bloque>

      <Bloque titulo="Si esto cambia">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Se actualiza esta página y se cambia la fecha de abajo. Nada de avisos escondidos.
        </p>
      </Bloque>

      <p className="stamp mt-8 text-ink-faint">Actualizada el {ACTUALIZADA}</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href="/"
          className="min-h-[46px] rounded-xl border border-line px-5 py-3 text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
        >
          Volver
        </Link>
        <Link href="/privacidad" className="text-[15px] text-amber underline underline-offset-2">
          Privacidad
        </Link>
        <Link href="/cookies" className="text-[15px] text-amber underline underline-offset-2">
          Cookies
        </Link>
      </div>
    </main>
  );
}

function Bloque({
  titulo,
  children,
  tono = "normal",
}: {
  titulo: string;
  children: React.ReactNode;
  tono?: "normal" | "aviso";
}) {
  return (
    <section
      className={`mt-6 rounded-caja border p-5 ${
        tono === "aviso" ? "border-clay/30 bg-clay/[0.05]" : "border-line-soft bg-paper-2"
      }`}
    >
      <h2 className="text-[17px] font-bold tracking-[-0.02em]">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Dato({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line-soft pt-3 first:border-0 first:pt-0 sm:flex-row sm:gap-4 [&+&]:mt-3">
      <dt className="stamp shrink-0 pt-1 text-ink-faint sm:w-36">{k}</dt>
      <dd className="text-[15px] leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}

function Punto({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[15px] leading-relaxed text-ink-soft">
      <span aria-hidden className="shrink-0 font-bold text-amber">
        ·
      </span>
      <span>{children}</span>
    </li>
  );
}
