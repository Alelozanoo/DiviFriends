import assert from "node:assert/strict";
import test from "node:test";
// Extensiones explícitas, como en el resto de los tests: así corre con el
// stripping de tipos nativo de Node, sin runner ni dependencias.
import { PLANTILLAS } from "./plantillas.ts";
import { money } from "./format.ts";

/**
 * El único test que de verdad hace falta aquí: que las cuentas cuadren.
 *
 * Estas líneas son las de las animaciones, y quien llega a la página acaba de
 * ver el ticket en el vídeo. Un céntimo de diferencia entre lo que dijo el reel
 * y lo que enseña la web deja al vídeo mintiendo, que es lo contrario de para
 * lo que existe esto.
 */
for (const [slug, p] of Object.entries(PLANTILLAS)) {
  test(`${slug}: las líneas suman el total del vídeo`, () => {
    const suma = p.cuenta.items.reduce((a, i) => a + i.totalCents, 0);
    assert.equal(
      suma,
      p.cuenta.totalCents,
      `las líneas suman ${money(suma)} y el vídeo dice ${money(p.cuenta.totalCents)}`,
    );
  });

  test(`${slug}: cada línea es unidades × precio`, () => {
    for (const item of p.cuenta.items) {
      assert.equal(item.totalCents, item.qty * item.unitCents, `la línea "${item.name}" no cuadra`);
      assert.ok(item.qty >= 1, `la línea "${item.name}" no tiene unidades`);
    }
  });

  test(`${slug}: la clave del mapa es el slug`, () => {
    // La URL sale de la clave y el texto del `slug`: si se separan, el vídeo
    // manda a una dirección y la página se llama de otra manera.
    assert.equal(slug, p.slug);
  });
}
