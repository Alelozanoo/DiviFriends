import assert from "node:assert/strict";
import test from "node:test";
import { consumeEnMemoria, decide, TOPE_API, type Counter, type Quota } from "./rateLimit.ts";

/*
 * `decide` es la aritmética de ventanas de los topes de uso. Se prueba aparte de
 * Firestore porque es donde está lo que puede salir mal: reiniciar la ventana
 * antes de tiempo abre la puerta que el tope debía cerrar, y no reiniciarla
 * nunca deja fuera a usuarios legítimos para siempre.
 */

const HORA = 3_600_000;
const AHORA = 1_700_000_000_000;

const porHora = (max: number): Quota => ({ key: "k", max, windowMs: HORA });

test("la primera petición pasa y abre la ventana", () => {
  const out = decide(AHORA, [porHora(3)], [undefined]);
  assert.equal(out.ok, true);
  assert.deepEqual(out.ok && out.writes[0], { count: 1, windowStart: AHORA });
});

test("dentro del tope sigue pasando sin mover la ventana", () => {
  const previo: Counter = { count: 2, windowStart: AHORA - 10 * 60_000 };
  const out = decide(AHORA, [porHora(3)], [previo]);
  assert.equal(out.ok, true);
  // La ventana no se reinicia al usarla: si no, nunca caducaría.
  assert.deepEqual(out.ok && out.writes[0], { count: 3, windowStart: previo.windowStart });
});

test("al llegar al tope rechaza y dice cuánto falta", () => {
  const previo: Counter = { count: 3, windowStart: AHORA - 50 * 60_000 };
  const out = decide(AHORA, [porHora(3)], [previo]);
  assert.equal(out.ok, false);
  assert.equal(out.ok === false && out.retryAfterSeconds, 10 * 60);
});

test("pasada la ventana el contador vuelve a empezar", () => {
  const previo: Counter = { count: 99, windowStart: AHORA - HORA - 1 };
  const out = decide(AHORA, [porHora(3)], [previo]);
  assert.equal(out.ok, true);
  assert.deepEqual(out.ok && out.writes[0], { count: 1, windowStart: AHORA });
});

test("un solo tope lleno bloquea, y no gasta cupo de los demás", () => {
  // Éste es el caso que importa: el global lleno no debe consumir el de la IP,
  // o alguien que nunca llegó a que le leyeran un ticket se quedaría sin cupo.
  const quotas: Quota[] = [
    { key: "ip", max: 20, windowMs: HORA },
    { key: "global", max: 300, windowMs: 24 * HORA },
  ];
  const counters: (Counter | undefined)[] = [
    { count: 0, windowStart: AHORA },
    { count: 300, windowStart: AHORA - HORA },
  ];

  const out = decide(AHORA, quotas, counters);
  assert.equal(out.ok, false);
  // 23 horas para que se libere el tope diario.
  assert.equal(out.ok === false && out.retryAfterSeconds, 23 * 3600);
});

test("el tiempo de espera es el del tope que más tarda en liberarse", () => {
  const quotas: Quota[] = [
    { key: "a", max: 1, windowMs: HORA },
    { key: "b", max: 1, windowMs: 24 * HORA },
  ];
  const counters: (Counter | undefined)[] = [
    { count: 1, windowStart: AHORA - 30 * 60_000 },
    { count: 1, windowStart: AHORA - 2 * HORA },
  ];
  const out = decide(AHORA, quotas, counters);
  assert.equal(out.ok === false && out.retryAfterSeconds, 22 * 3600);
});

/*
 * El tope general de la API lleva su cuenta en memoria, así que se puede probar
 * entera: lo que importa es que deje pasar una mesa normal y corte a quien
 * insiste, y que cada IP tenga su propia cuenta y no herede la del vecino.
 */

test("el tope de la API deja pasar hasta el máximo y corta el siguiente", () => {
  const clave = "ip_prueba_tope";
  for (let i = 0; i < TOPE_API.max; i++) {
    assert.equal(consumeEnMemoria(clave, AHORA).ok, true, `la petición ${i + 1} debería caber`);
  }
  const cortada = consumeEnMemoria(clave, AHORA);
  assert.equal(cortada.ok, false);
  assert.equal(cortada.ok === false && cortada.retryAfterSeconds, 60);
});

test("la ventana se reabre al minuto y no antes", () => {
  const clave = "ip_prueba_ventana";
  for (let i = 0; i < TOPE_API.max; i++) consumeEnMemoria(clave, AHORA);
  assert.equal(consumeEnMemoria(clave, AHORA + 59_000).ok, false);
  assert.equal(consumeEnMemoria(clave, AHORA + 60_000).ok, true);
});

test("cada IP lleva su propia cuenta", () => {
  const una = "ip_prueba_una";
  for (let i = 0; i < TOPE_API.max; i++) consumeEnMemoria(una, AHORA);
  assert.equal(consumeEnMemoria(una, AHORA).ok, false);
  assert.equal(consumeEnMemoria("ip_prueba_otra", AHORA).ok, true);
});

test("una mesa entera detrás del wifi del bar cabe de sobra", () => {
  // Ocho móviles sin escucha en vivo preguntando cada tres segundos durante un
  // minuto, todos con la misma IP pública: 160 peticiones.
  const clave = "ip_prueba_bar";
  for (let i = 0; i < 8 * 20; i++) {
    assert.equal(consumeEnMemoria(clave, AHORA).ok, true);
  }
});
