"use client";

import { olvidarTodo, recordar, useMisDivis } from "@/lib/misDivis";
import MisDivis from "@/components/MisDivis";
import { PALETTE } from "@/lib/format";

/**
 * Los mandos de la prueba: sembrar casos y vaciar.
 *
 * Los ejemplos cubren los cuatro estados que cambian la fila —debes a alguien,
 * te deben, cuadrado, y sin nombre de sitio— porque son justo donde se ve si el
 * color y la palabra de debajo dicen lo que tienen que decir.
 */
const EJEMPLOS = [
  {
    code: "RB9VSM",
    place: "Asador Casa Paco",
    horasAtras: 2,
    cents: 1240,
    aQuien: "Álex",
    saldado: false,
    gente: ["Álex", "Sofía", "Ana", "Marta", "Leo"],
  },
  {
    code: "GWJ63C",
    place: "Bar Pepe",
    horasAtras: 27,
    cents: -2470,
    aQuien: null,
    saldado: false,
    gente: ["Leo", "Ana"],
  },
  {
    code: "B5UZTY",
    place: "Carnicería Los Gemelos",
    horasAtras: 26 * 3,
    cents: 833,
    aQuien: "Marta",
    saldado: true,
    gente: ["Marta", "Sofía", "Álex"],
  },
  {
    // Sin nombre: el OCR no siempre acierta con el sitio, y la fila tiene que
    // seguir distinguiéndose de las demás.
    code: "XKTVHK",
    place: null,
    horasAtras: 26 * 9,
    cents: 560,
    aQuien: "Ana",
    saldado: false,
    gente: ["Ana", "Álex", "Leo", "Sofía", "Marta", "Luis"],
  },
];

export default function Banco() {
  const { divis } = useMisDivis();

  function sembrar() {
    // Del más viejo al más nuevo: `recordar` pone cada uno arriba, así queda
    // ordenado como en la vida real.
    for (const e of [...EJEMPLOS].reverse()) {
      recordar({
        code: e.code,
        place: e.place,
        at: new Date(Date.now() - e.horasAtras * 3_600_000).toISOString(),
        currency: "EUR",
        cents: e.cents,
        aQuien: e.aQuien,
        saldado: e.saldado,
        gente: e.gente.map((name, i) => ({ name, color: PALETTE[i % PALETTE.length] })),
      });
    }
  }

  return (
    <>
      <div className="mt-6 rounded-2xl border border-dashed border-line p-4">
        <p className="stamp text-ink-faint">Banco de pruebas</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={sembrar}
            className="flex-1 rounded-xl bg-mint py-2.5 text-sm font-bold text-paper transition-transform active:scale-[0.98]"
          >
            Poner ejemplos
          </button>
          <button
            type="button"
            onClick={() => olvidarTodo()}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay"
          >
            Vaciar
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Los de verdad se apuntan solos al entrar en una comanda y unirte. Los
          ejemplos llevan códigos de comandas de prueba, así que al tocarlos puede
          que no exista ninguna.
        </p>
      </div>

      <div className="mt-6">
        <MisDivis />
      </div>

      {divis !== null && divis.length === 0 && (
        <p className="mt-6 rounded-xl border border-line bg-paper-2 px-4 py-6 text-center text-sm text-ink-faint">
          Sin divis guardados no se pinta nada. Así es como lo verá quien llegue
          por primera vez: la portada, igual que ahora.
        </p>
      )}
    </>
  );
}
