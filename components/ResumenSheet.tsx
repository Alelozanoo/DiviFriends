"use client";

import Link from "next/link";
import { money } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cuando, useMisDivis } from "@/lib/misDivis";
import { debes, delMes, teDeben, type Linea } from "@/lib/resumen";
import { CerrarHoja, Sheet } from "./ui";

/**
 * Tus números del mes.
 *
 * Quien paga con la tarjeta y luego pide por WhatsApp no sabe nunca dos cosas:
 * cuánto lleva adelantado y quién le falta por devolver. Las dos están ya en
 * las divis que guarda el móvil —lo que pusiste, lo que era tuyo y quién te
 * debe—, así que esto no pregunta nada al servidor: suma lo que hay y lo
 * enseña.
 *
 * El número grande es lo que te deben, porque es el único que hace hacer algo.
 * Lo demás va debajo y en pequeño, y cuadra por construcción: lo adelantado es
 * la suma de las deudas de la mesa, no una resta entre dos cifras que podrían
 * no encajar si la mesa se quedó a medio repartir.
 */
export default function ResumenSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { divis } = useMisDivis();
  const lista = divis ?? [];

  const mes = delMes(lista);
  const pendientes = teDeben(lista);
  const debidas = debes(lista);
  const adelantado = mes.vueltoCents + mes.debenCents;

  /*
    El número grande es de siempre, no del mes, porque es el mismo que suma la
    lista que va justo debajo. Con el del mes no cuadraban: una deuda de hace
    cinco semanas sigue viva y sale en la lista, pero no en septiembre.
  */
  const moneda = pendientes[0]?.currency ?? mes.currency;
  const debenTotal = pendientes
    .filter((l) => l.currency === moneda)
    .reduce((a, l) => a + l.cents, 0);

  const nombreMes = new Date().toLocaleDateString("es-ES", { month: "long" });

  return (
    <Sheet onClose={onClose} titulo={t.resumen.titulo} sub={t.resumen.entradilla}>
      {lista.length === 0 ? (
        <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">{t.resumen.vacio}</p>
      ) : (
        <>
          {/* El número que hace hacer algo. */}
          <div className="mt-5 rounded-caja border border-line-soft bg-paper px-4 py-4">
            <p className="text-[12px] text-ink-faint">{t.resumen.teDeben}</p>
            <p
              className={`tnum mt-0.5 text-[32px] font-bold leading-none tracking-[-0.02em] ${
                debenTotal > 0 ? "text-amber" : "text-mint"
              }`}
            >
              {debenTotal > 0 ? money(debenTotal, moneda) : t.resumen.enPaz}
            </p>

            <dl className="mt-4 grid gap-1.5 border-t border-line-soft pt-3 text-[13px]">
              <p className="mb-0.5 text-[12px] capitalize text-ink-faint">{nombreMes}</p>
              <Fila k={t.resumen.pusiste} v={money(mes.puestoCents, mes.currency)} />
              <Fila k={t.resumen.tuyo} v={money(mes.mioCents, mes.currency)} apagado />
              <Fila k={t.resumen.adelantaste} v={money(adelantado, mes.currency)} apagado />
              <Fila k={t.resumen.devuelto} v={money(mes.vueltoCents, mes.currency)} apagado />
            </dl>
          </div>

          {mes.sinDatos > 0 && (
            <p className="mt-2 px-1 text-[12px] leading-relaxed text-ink-faint">
              {mes.sinDatos === 1 ? t.resumen.sinDatosUna : t.resumen.sinDatos.replace("{n}", String(mes.sinDatos))}
            </p>
          )}

          <Lista titulo={t.resumen.quienTeDebe} lineas={pendientes} onIr={onClose} vacio={t.resumen.nadieTeDebe} />
          {debidas.length > 0 && (
            <Lista titulo={t.resumen.debesTu} lineas={debidas} onIr={onClose} tono="clay" />
          )}
        </>
      )}

      <div className="mt-5">
        <CerrarHoja onClick={onClose}>{t.cuenta.cerrar}</CerrarHoja>
      </div>
    </Sheet>
  );
}

function Fila({ k, v, apagado }: { k: string; v: string; apagado?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={apagado ? "text-ink-faint" : "text-ink-soft"}>{k}</dt>
      <dd className={`tnum font-semibold ${apagado ? "text-ink-soft" : "text-ink"}`}>{v}</dd>
    </div>
  );
}

/**
 * Cada línea lleva a su mesa. Es lo primero que se quiere hacer después de
 * leer «Sofía, 2 €»: entrar y mirar de qué era.
 */
function Lista({
  titulo,
  lineas,
  onIr,
  vacio,
  tono = "amber",
}: {
  titulo: string;
  lineas: Linea[];
  onIr: () => void;
  vacio?: string;
  tono?: "amber" | "clay";
}) {
  const t = useT();
  if (lineas.length === 0 && !vacio) return null;

  return (
    <>
      <p className="mt-5 px-1 text-[12px] text-ink-faint">{titulo}</p>
      {lineas.length === 0 ? (
        <p className="mt-1 px-1 text-[14px] text-ink-soft">{vacio}</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {lineas.map((l, i) => (
            <li key={`${l.code}-${l.name}-${i}`}>
              <Link
                href={`/t/${l.code}`}
                onClick={onIr}
                className="flex items-center gap-3 rounded-pieza border border-line-soft bg-paper px-3.5 py-2.5 transition-colors active:bg-paper-3"
              >
                <span className={`tnum shrink-0 text-[16px] font-bold ${tono === "clay" ? "text-clay" : "text-amber"}`}>
                  {money(l.cents, l.currency)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {tono === "clay" ? `${t.misDivis.a} ${l.name}` : l.name}
                  </span>
                  <span className="block truncate text-[12px] text-ink-faint">
                    {[l.place, cuando(l.at, t)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
