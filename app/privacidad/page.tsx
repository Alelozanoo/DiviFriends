import Link from "next/link";
import type { Metadata } from "next";
import { RESPONSABLE } from "@/lib/responsable";

/**
 * La política de privacidad.
 *
 * Escrita a partir de lo que el código hace de verdad, no de una plantilla: si
 * aquí pone que la foto no se guarda es porque `app/api/tickets/route.ts` la
 * manda a leer y no la escribe en ningún sitio. Cuando cambie el código, esto
 * cambia con él — una política que describe otra app no protege a nadie.
 */

/*
  Quién responde de los datos. El RGPD obliga a decirlo, y la LSSI a que se
  encuentre sin buscar: por eso va arriba y no en una nota al pie.
*/
export const metadata: Metadata = {
  title: "Privacidad",
  description:
    "Qué datos guarda DiviFriends, quién los ve y cómo se borran. En castellano y sin letra pequeña.",
  robots: { index: true, follow: true },
};

const ACTUALIZADA = "3 de septiembre de 2026";

/* Si el píxel está apagado, decirlo en pasado y no prometer un consentimiento
   que ya no se pide. La página se ajusta sola cuando vuelva. */
const HAY_PIXEL = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);

export default function PrivacidadPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-[var(--gutter)] py-12">
      <h1 className="text-[27px] font-bold leading-tight tracking-[-0.03em]">Privacidad</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Repartir una cuenta no debería costarte tus datos. Aquí está, en castellano, qué se
        guarda, quién lo ve y cómo se borra.
      </p>

      <Bloque titulo="La versión corta">
        <ul className="grid gap-2">
          <Punto>
            No hace falta cuenta ni contraseña: escribes tu nombre y ya estás. Si quieres, entras
            con Google para que tu nombre, tu foto y tus divis te sigan de un móvil a otro.
          </Punto>
          <Punto>
            La foto del ticket <b className="text-ink">no se guarda</b>: se lee y se queda el
            texto.
          </Punto>
          <Punto>
            Lo que sí se guarda es la comanda: los platos, quién marcó qué y los nombres de la
            mesa.
          </Punto>
          <Punto>
            <b className="text-ink">Cualquiera con el enlace o el código ve esa mesa.</b> No hay
            candado: el enlace <em>es</em> la llave.
          </Punto>
          <Punto>
            Las mesas <b className="text-ink">se borran solas a los 30 días</b> sin usarse.
          </Punto>
          <Punto>No se vende nada a nadie. Nunca.</Punto>
        </ul>
      </Bloque>

      <Bloque titulo="Quién responde">
        <Dato k="Responsable">{RESPONSABLE.nombre}</Dato>
        <Dato k="NIF">{RESPONSABLE.nif}</Dato>
        <Dato k="Correo">
          <a
            href={`mailto:${RESPONSABLE.correo}`}
            className="text-amber underline underline-offset-2"
          >
            {RESPONSABLE.correo}
          </a>
        </Dato>
        <Dato k="Servicio">divifriends.es</Dato>
      </Bloque>

      <Bloque titulo="Qué datos y para qué">
        <Dato k="Tu nombre">
          El que escribes al entrar en una mesa. Puede ser un apodo: nadie comprueba nada. Sirve
          para que el resto sepa de quién es cada plato.
        </Dato>
        <Dato k="Tu foto">
          Opcional. Si la pones, se guarda dentro de la propia comanda para distinguirte de un
          vistazo. Puedes quitarla cuando quieras desde «Editar mi perfil».
        </Dato>
        <Dato k="Tu móvil o tu usuario de Revolut">
          Opcional, y sólo si eres quien puso el dinero y quiere que le paguen. Se enseña a los
          demás de tu mesa para que puedan devolvértelo.
        </Dato>
        <Dato k="Lo que marcas">
          Qué has consumido y cuánto te toca. Es el servicio: sin eso no hay cuenta que repartir.
        </Dato>
        <Dato k="La foto del ticket">
          Se envía para leerla y <b className="text-ink">no se almacena</b>. Lo que queda es la
          lista de platos y precios que salga de ella.
        </Dato>
        <Dato k="Un hash de tu IP">
          Para frenar abusos hay un contador de peticiones. Guarda un resumen criptográfico de la
          IP, <b className="text-ink">nunca la IP</b>, y sólo sirve para contar.
        </Dato>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
          La base legal es la ejecución del servicio que pides (artículo 6.1.b del RGPD). Lo
          opcional —foto, móvil, usuario de Revolut— lo aportas tú y puedes retirarlo cuando
          quieras.
        </p>
      </Bloque>

      <Bloque titulo="Si entras con Google">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Es opcional y la web funciona igual sin ello. Lo que da es memoria: lo que hasta ahora se
          guardaba sólo en tu móvil pasa a guardarse también en tu cuenta.
        </p>
        <div className="mt-4">
          <Dato k="Tu correo">
            Lo da Google al entrar. Sirve para reconocerte y para avisarte de lo que pase en tus
            mesas. <b className="text-ink">No se enseña a nadie</b>, tampoco a la gente de tu mesa.
          </Dato>
          <Dato k="Tu nombre y tu foto">
            Los mismos que pones en una mesa, guardados para no tener que escribirlos cada vez. La
            foto se recorta a 150 píxeles antes de guardarse; la de Google no se guarda tal cual.
          </Dato>
          <Dato k="Bizum y Revolut">Si los pusiste, para que quien te deba pueda pagarte de un toque.</Dato>
          <Dato k="Tus divis">
            Las últimas doce mesas por las que has pasado, con tu saldo y las caras de la mesa. Es lo
            mismo que «Tus divis» de la portada, sólo que ya no vive únicamente en un móvil.
          </Dato>
          <Dato k="Google">
            Es quien comprueba que eres tú. Recibe que has entrado en DiviFriends, como con cualquier
            web que use su botón. Está en Estados Unidos; la transferencia se ampara en sus cláusulas
            contractuales tipo.
          </Dato>
          <Dato k="Para que no te olvide">
            Mantener la sesión abierta necesita guardar un dato en el navegador. Es estrictamente
            necesario para lo que has pedido —entrar— y por eso no pasa por el aviso de cookies.
          </Dato>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
          La base legal sigue siendo el servicio que pides (artículo 6.1.b del RGPD). La cuenta se
          borra desde «Tu cuenta» → «Borrar mi cuenta», al momento y entera: el perfil, las divis y
          la entrada con Google. Las mesas en las que estuviste no se tocan, porque son de la mesa.
        </p>
      </Bloque>

      <Bloque titulo="Amigos y avisos por correo">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Con cuenta puedes tener amigos y meterlos en una mesa de un toque. Las dos cosas están
          pensadas para que nadie sepa de ti más de lo que le enseñas.
        </p>
        <div className="mt-4">
          <Dato k="Cómo se hacen los amigos">
            Por enlace, no buscando por correo. Cada cuenta tiene un enlace que se manda por
            WhatsApp; quien lo abre pide, y tú aceptas. <b className="text-ink">Nadie entra en tu
            lista sin que digas que sí</b>, y buscar por correo no existe para que nadie pueda saber
            si una persona tiene cuenta.
          </Dato>
          <Dato k="Tu usuario">
            Opcional. Si eliges uno (@así), tus amigos te pueden añadir con él en vez de con el
            código. Quien lo sepa ve lo mismo que con el enlace —tu nombre y tu foto— y podrá
            pedirte amistad, que sigues teniendo que aceptar. Si no quieres que nadie te encuentre
            por un nombre, no elijas uno.
          </Dato>
          <Dato k="Qué ven tus amigos">Tu nombre, tu foto y tu usuario si lo tienes. Nunca tu correo.</Dato>
          <Dato k="Qué correos llegan">
            Sólo cuatro, y sólo si tienes cuenta: que alguien te pide amistad, que un amigo te ha
            metido en una mesa, que la mesa se ha cerrado y cuánto te toca, y que alguien dice
            haberte pagado. Son avisos de algo tuyo, <b className="text-ink">nunca publicidad</b>.
          </Dato>
          <Dato k="Cuántos">
            Uno por hecho: si te meten y te quitan, no se repite. Como mucho cinco al día por persona,
            y con un tope global para toda la web. Cada correo dice por qué te llega.
          </Dato>
          <Dato k="Cómo se apagan">
            Desde «Tu cuenta» → «Avisos por correo», o desde el enlace que va al pie de cada correo,
            sin tener que entrar. Al momento.
          </Dato>
          <Dato k="Quién los manda">
            Salen de hola@divifriends.es por el proveedor que aloja ese buzón, en la Unión Europea.
            Cada aviso se guarda también en tu cuenta —el asunto y a qué mesa lleva— para
            enseñártelo en la campana de la portada, tengas los correos encendidos o no. Se borra
            con la cuenta.
          </Dato>
        </div>
      </Bloque>

      <Bloque titulo="Quién más lo ve" tono="aviso">
        <Dato k="Tu mesa">
          Cualquiera que tenga el enlace o el código de seis letras. La comanda está pensada para
          compartirse en un grupo, así que <b className="text-ink">no metas ahí nada que no
          quieras que vea quien reenvíe ese enlace</b>.
        </Dato>
        <Dato k="Quien aloja la web">
          Un proveedor de infraestructura en la nube guarda la web y la base de datos. Actúa como
          encargado del tratamiento: trabaja siguiendo nuestras instrucciones y{" "}
          <b className="text-ink">no puede usar tus datos para lo suyo</b>.
        </Dato>
        <Dato k="Quien lee la foto">
          Un proveedor de inteligencia artificial recibe la foto del ticket y devuelve la lista de
          platos. Está en Estados Unidos, así que hay una transferencia internacional amparada en
          sus cláusulas contractuales tipo.
        </Dato>
        <Dato k="Publicidad">
          {HAY_PIXEL ? (
            <>
              Hay un píxel de Meta, y sólo se carga si aceptas la cookie. Sirve para saber si un
              anuncio funciona: nunca van nombres, importes ni el código de la mesa.
            </>
          ) : (
            <>
              Ninguna. No hay píxel de Meta ni de nadie, así que{" "}
              <b className="text-ink">nada de lo que hagas aquí se sigue fuera de aquí</b>. La
              única cookie que existe se llama <code className="tnum">divi.lang</code> y guarda
              en qué idioma quieres ver la web: es técnica, no mide nada y por eso no hace falta
              aceptarla.
            </>
          )}{" "}
          Lo cuenta entero la{" "}
          <Link href="/cookies" className="text-amber underline underline-offset-2">
            página de cookies
          </Link>
          .
        </Dato>
        <Dato k="Nadie más">No se vende ni se cede a terceros para publicidad.</Dato>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
          El RGPD deja decir la categoría de cada destinatario en vez de la empresa concreta
          (artículo 13.1.e), que es lo que hay aquí arriba. Si quieres saber exactamente qué
          empresa es cada una,{" "}
          <a href={`mailto:${RESPONSABLE.correo}`} className="text-amber underline underline-offset-2">
            pídelo por correo
          </a>{" "}
          y te lo decimos.
        </p>
      </Bloque>

      <Bloque titulo="Cuánto tiempo">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Una comanda <b className="text-ink">se borra sola a los 30 días</b> sin que nadie la
          toque. El reloj se reinicia con cada cambio, así que una mesa en uso no caduca; una
          olvidada desaparece con todo lo que llevaba dentro.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          También puedes salirte de una mesa cuando quieras —los tres puntos, «Salirme de la
          mesa»— y con ello desaparecen tu nombre, tu foto y lo que hubieras marcado.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Una cuenta dura hasta que la borras tú, desde «Tu cuenta» → «Borrar mi cuenta». No hay
          que escribir a nadie.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Y si quieres que se borre una mesa entera antes de tiempo, escribe a{" "}
          <a href={`mailto:${RESPONSABLE.correo}`} className="text-amber underline underline-offset-2">
            {RESPONSABLE.correo}
          </a>{" "}
          con el código y se hace.
        </p>
      </Bloque>

      <Bloque titulo="Lo que puedes pedir">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Acceder a tus datos, corregirlos, borrarlos, oponerte a que se traten, limitarlos o
          llevártelos. Se pide por correo, con el código de la mesa para poder encontrarlos.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Y si crees que algo se ha hecho mal, puedes reclamar ante la{" "}
          <a
            href="https://www.aepd.es"
            className="text-amber underline underline-offset-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            Agencia Española de Protección de Datos
          </a>
          .
        </p>
      </Bloque>

      <Bloque titulo="Menores">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Esto no está pensado para menores de 14 años. Si nos consta que alguien por debajo de esa
          edad ha dejado datos, se borran.
        </p>
      </Bloque>

      <Bloque titulo="Si esto cambia">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Se actualiza esta página y se cambia la fecha de abajo. Nada de avisos escondidos.
        </p>
      </Bloque>

   <p className="text-[12px] mt-8 text-ink-faint">Actualizada el {ACTUALIZADA}</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href="/"
          className="min-h-[46px] rounded-xl border border-line px-5 py-3 text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
        >
          Volver
        </Link>
        <Link href="/cookies" className="text-[15px] text-amber underline underline-offset-2">
          Cookies
        </Link>
        <Link href="/aviso-legal" className="text-[15px] text-amber underline underline-offset-2">
          Aviso legal
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
   <dt className="text-[12px] shrink-0 pt-1 text-ink-faint sm:w-36">{k}</dt>
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
