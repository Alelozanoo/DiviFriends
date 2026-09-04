import Link from "next/link";
import type { Metadata } from "next";
import { RESPONSABLE } from "@/lib/responsable";

/**
 * Los términos y condiciones de la cuenta.
 *
 * Existen desde que crear una cuenta pide aceptarlos (4 de septiembre de
 * 2026). El aviso legal ya cuenta qué es la app y qué no promete; esto es lo
 * que se añade al tener cuenta: un usuario que es tuyo y único, unos datos de
 * cobro que enseñas a tu mesa, y un correo que sólo se usa para lo que has
 * dicho que sí. Escrito para leerse, no para cubrirse.
 */

const ACTUALIZADA = "4 de septiembre de 2026";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Lo que aceptas al crear una cuenta en DiviFriends: tu usuario, tus datos de cobro y las novedades por correo. En castellano y sin letra pequeña.",
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-[var(--gutter)] py-12">
      <h1 className="text-[27px] font-bold leading-tight tracking-[-0.03em]">Términos y condiciones</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Lo que aceptas al crear una cuenta. Qué es la app y qué no promete está en el{" "}
        <Link href="/aviso-legal" className="text-amber underline underline-offset-2">
          aviso legal
        </Link>
        , y lo que se hace con tus datos, en la{" "}
        <Link href="/privacidad" className="text-amber underline underline-offset-2">
          política de privacidad
        </Link>
        . Las tres páginas se leen en diez minutos.
      </p>

      <Bloque titulo="La versión corta">
        <ul className="grid gap-2">
          <Punto>La cuenta es gratis y sirve para que tu nombre, tu foto y tus mesas te sigan de un móvil a otro.</Punto>
          <Punto>Tu usuario es único, es tuyo y se puede cambiar una vez cada catorce días.</Punto>
          <Punto>Tu Bizum y tu Revolut son opcionales, y sólo los ve la gente de tus mesas para devolverte el dinero.</Punto>
          <Punto>Sólo te escribimos novedades si lo marcas, y te das de baja cuando quieras.</Punto>
          <Punto>Puedes borrar la cuenta cuando quieras, y se borra de verdad.</Punto>
        </ul>
      </Bloque>

      <Bloque titulo="Quién responde">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          {RESPONSABLE.nombre}, NIF {RESPONSABLE.nif}, para lo que sea:{" "}
          <a href={`mailto:${RESPONSABLE.correo}`} className="text-amber underline underline-offset-2">
            {RESPONSABLE.correo}
          </a>
          .
        </p>
      </Bloque>

      <Bloque titulo="Qué aceptas al crear la cuenta">
        <ul className="grid gap-2">
          <Punto>Que tienes al menos catorce años. Por debajo de esa edad no se puede crear una cuenta.</Punto>
          <Punto>Que entras con tu propia cuenta de Google y que el nombre, la foto y los datos de cobro que pones son tuyos.</Punto>
          <Punto>Que usas la app para lo que es, repartir cuentas entre gente que ha comido junta, y no para molestar, engañar o hacerte pasar por otra persona.</Punto>
        </ul>
      </Bloque>

      <Bloque titulo="Tu usuario">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          El usuario, <span className="font-mono">@así</span>, es con lo que tus amigos te añaden a una
          mesa en vez de con el código. Es único: si alguien ya lo tiene, hay que elegir otro.
        </p>
        <ul className="mt-3 grid gap-2">
          <Punto>De tres a veinte letras minúsculas, cifras o guion bajo.</Punto>
          <Punto>Elegirlo la primera vez es gratis; después se puede cambiar <strong className="text-ink">una vez cada catorce días</strong>, para que la gente sepa quién eres.</Punto>
          <Punto>Al cambiarlo, el anterior queda libre para quien lo quiera.</Punto>
          <Punto>Un usuario que suplante a otra persona, a una marca o que insulte se puede retirar sin avisar.</Punto>
        </ul>
      </Bloque>

      <Bloque titulo="Tus datos de cobro" tono="aviso">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          El teléfono del Bizum y el usuario de Revolut son opcionales. Si los pones, la gente de tus
          mesas los ve para devolverte lo que te deben. DiviFriends <strong className="text-ink">no mueve dinero</strong>:
          calcula quién le debe cuánto a quién, y el pago lo hacéis vosotros por donde queráis. Ni se
          cobra comisión ni se garantiza que nadie pague.
        </p>
      </Bloque>

      <Bloque titulo="Las novedades por correo">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Al registrarte puedes marcar que quieres enterarte de las novedades de DiviFriends. Es
          opcional y viene sin marcar. Si lo marcas, te llegarán de vez en cuando correos con lo
          nuevo de la app, siempre desde {RESPONSABLE.correo}, y nunca publicidad de terceros ni
          se cede tu correo a nadie. Te das de baja cuando quieras desde tu cuenta o desde el pie
          de cualquier correo, y se acaba en el acto.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Aparte están los avisos de servicio, que te enteran de que te han metido en una mesa, de
          que se ha cerrado o de que te han pagado. Esos también se apagan desde la cuenta.
        </p>
      </Bloque>

      <Bloque titulo="Qué hace la app y qué no promete">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Lee el ticket con un modelo de inteligencia artificial y calcula el reparto. Puede leer mal
          una línea: el papel manda, y la comanda se corrige a mano. Los importes, los saldos y quién
          le debe a quién son una ayuda para poneros de acuerdo, no un documento con validez legal.
          El detalle está en el{" "}
          <Link href="/aviso-legal" className="text-amber underline underline-offset-2">
            aviso legal
          </Link>
          .
        </p>
      </Bloque>

      <Bloque titulo="Cerrar y borrar la cuenta">
        <ul className="grid gap-2">
          <Punto>Cerrar la sesión no borra nada: lo de este móvil se queda, y en tu cuenta sigue todo.</Punto>
          <Punto>
            Borrar la cuenta se hace desde{" "}
            <Link href="/privacidad#borrar" className="text-amber underline underline-offset-2">
              Privacidad y borrado
            </Link>
            , y borra tu perfil, tus divis, tu usuario y la entrada con Google. Las mesas en las que estuviste no se tocan: son de la mesa, no tuyas.
          </Punto>
          <Punto>Si una cuenta se usa para molestar o suplantar, se puede cerrar sin avisar.</Punto>
        </ul>
      </Bloque>

      <Bloque titulo="Qué ley y qué juzgados">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          La ley española. Para cualquier conflicto, los juzgados que correspondan al domicilio del
          usuario, que es lo que marca la ley de consumidores.
        </p>
      </Bloque>

      <Bloque titulo="Si esto cambia">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Si cambian los términos en algo que te afecte, se avisará en la app antes de que entre en
          vigor, y seguir usando la cuenta será aceptarlos. Esta versión es del {ACTUALIZADA}.
        </p>
      </Bloque>
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
