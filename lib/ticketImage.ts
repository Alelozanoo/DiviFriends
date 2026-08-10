import { money, quantity } from "./format";
import type { TicketState } from "./types";

/**
 * El ticket dibujado como imagen, para poder mandarlo por WhatsApp.
 *
 * Se pinta en el navegador y no en el servidor a propósito: es media docena de
 * líneas de texto sobre un rectángulo crema, y montar una ruta que lo devuelva
 * significaría un arranque en frío de dos segundos justo cuando alguien está
 * esperando a que se abra el menú de compartir. Aquí sale al instante y
 * funciona aunque se haya ido la cobertura.
 *
 * Las fuentes se leen de la propia página en vez de nombrarlas: `next/font`
 * les pone un nombre generado (`__Space_Grotesk_ab12cd`) que no se puede
 * escribir a mano y que además cambia en cada compilación.
 */

/** Los mismos colores que el ticket de papel de la pantalla. */
const PAPEL = "#f4ece0";
const TINTA = "#14100d";
const TENUE = "#776a5c";

const ANCHO = 760;
const MARGEN = 56;
/** Se dibuja al doble para que no se vea borroso al ampliarlo en el móvil. */
const ESCALA = 2;

export async function ticketPng(state: TicketState, url: string, qrSvg?: string): Promise<Blob | null> {
  const { ticket, items } = state;

  // Sin esto, las primeras medidas salen con la fuente de reserva y el texto
  // acaba descuadrado respecto a lo que luego se pinta.
  await document.fonts.ready;
  const raiz = getComputedStyle(document.body);
  const titulos = raiz.getPropertyValue("--font-display") || raiz.fontFamily;
  const cifras = raiz.getPropertyValue("--font-figure") || "monospace";

  const regla = document.createElement("canvas").getContext("2d");
  if (!regla) return null;

  const fuente = (peso: string, px: number, familia: string) => `${peso} ${px}px ${familia}`;
  const anchoDe = (texto: string, f: string) => {
    regla.font = f;
    return regla.measureText(texto).width;
  };

  /* ------------------------------------------------------------- medidas */

  const fLinea = fuente("500", 24, titulos);
  const fCifra = fuente("500", 24, cifras);
  const cantidades = items.map((i) => quantity(i.qty));
  const anchoCantidad = Math.max(0, ...cantidades.map((c) => anchoDe(c, fCifra)));
  const importes = items.map((i) => money(i.totalCents, ticket.currency));
  const anchoImporte = Math.max(0, ...importes.map((t) => anchoDe(t, fCifra)));

  // El nombre se queda con lo que sobra entre las dos columnas de números.
  const huecoNombre = ANCHO - MARGEN * 2 - anchoCantidad - anchoImporte - 48;
  const nombres = items.map((item) => partir(item.name, huecoNombre, fLinea, anchoDe));

  const altoLinea = 34;
  const altoLista = nombres.reduce((a, trozos) => a + trozos.length * altoLinea + 12, 0);
  const ALTO = 150 + altoLista + 560;

  /* ------------------------------------------------------------- dibujo */

  const canvas = document.createElement("canvas");
  canvas.width = ANCHO * ESCALA;
  canvas.height = ALTO * ESCALA;
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.scale(ESCALA, ESCALA);
  c.textBaseline = "alphabetic";

  c.fillStyle = PAPEL;
  c.fillRect(0, 0, ANCHO, ALTO);

  let y = 78;

  c.fillStyle = TINTA;
  c.font = fuente("700", 34, titulos);
  c.textAlign = "center";
  c.fillText(recortar(ticket.place ?? "Comanda", ANCHO - MARGEN * 2, c), ANCHO / 2, y);
  y += 34;

  c.font = fuente("500", 18, cifras);
  c.fillStyle = TENUE;
  c.fillText(fecha(ticket.createdAt), ANCHO / 2, y);
  y += 34;

  rayaDePuntos(c, y);
  y += 40;

  c.textAlign = "left";
  items.forEach((item, i) => {
    const arranqueNombre = MARGEN + anchoCantidad + 24;

    c.fillStyle = TENUE;
    c.font = fCifra;
    c.textAlign = "right";
    c.fillText(cantidades[i], MARGEN + anchoCantidad, y);

    c.fillStyle = TINTA;
    c.font = fCifra;
    c.fillText(importes[i], ANCHO - MARGEN, y);

    c.font = fLinea;
    c.textAlign = "left";
    for (const trozo of nombres[i]) {
      c.fillText(trozo, arranqueNombre, y);
      y += altoLinea;
    }
    y += 12;
  });

  y += 6;
  rayaDePuntos(c, y);
  y += 52;

  c.fillStyle = TINTA;
  c.font = fuente("700", 20, cifras);
  c.textAlign = "left";
  c.fillText("TOTAL", MARGEN, y);
  c.font = fuente("700", 44, cifras);
  c.textAlign = "right";
  c.fillText(money(ticket.totalCents, ticket.currency), ANCHO - MARGEN, y + 6);
  y += 70;

  c.fillStyle = TENUE;
  c.font = fuente("500", 18, cifras);
  c.textAlign = "center";
  c.fillText("Repartid la cuenta", ANCHO / 2, y);
  y += 30;

  if (qrSvg) {
    const blob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.src = objectUrl;
    await new Promise((r) => { img.onload = r; });
    const qrSize = 220;
    c.drawImage(img, (ANCHO - qrSize) / 2, y, qrSize, qrSize);
    URL.revokeObjectURL(objectUrl);
    y += qrSize + 40;
  }

  c.fillStyle = TINTA;
  c.font = fuente("700", 26, cifras);
  c.textAlign = "center";
  c.fillText(ticket.id.split("").join("  "), ANCHO / 2, y);
  y += 34;

  c.fillStyle = TENUE;
  c.font = fuente("500", 16, cifras);
  c.textAlign = "center";
  c.fillText("Escanea o entra en divifriends y mete el código", ANCHO / 2, y);
  y += 50;

  // El pie es lo que convierte la foto en una invitación: sin el código, la
  // imagen es un ticket bonito que no lleva a ninguna parte.
  c.fillStyle = TENUE;
  c.font = fuente("500", 17, cifras);
  c.textAlign = "center";
  c.fillText(url.replace(/^https?:\/\//, ""), ANCHO / 2, y + 22);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/** Parte un nombre largo en las líneas que quepan. */
function partir(
  texto: string,
  ancho: number,
  fuente: string,
  medir: (t: string, f: string) => number,
): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [""];

  const lineas: string[] = [];
  let actual = palabras[0];
  for (const palabra of palabras.slice(1)) {
    const probada = `${actual} ${palabra}`;
    if (medir(probada, fuente) <= ancho) actual = probada;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  lineas.push(actual);
  // Tres líneas para un nombre de plato ya es un error de lectura, no un plato.
  return lineas.slice(0, 3);
}

function recortar(texto: string, ancho: number, c: CanvasRenderingContext2D): string {
  if (c.measureText(texto).width <= ancho) return texto;
  let corto = texto;
  while (corto.length > 1 && c.measureText(`${corto}…`).width > ancho) corto = corto.slice(0, -1);
  return `${corto}…`;
}

function rayaDePuntos(c: CanvasRenderingContext2D, y: number): void {
  c.save();
  c.strokeStyle = TENUE;
  c.globalAlpha = 0.45;
  c.lineWidth = 2;
  c.setLineDash([10, 9]);
  c.beginPath();
  c.moveTo(MARGEN, y);
  c.lineTo(ANCHO - MARGEN, y);
  c.stroke();
  c.restore();
}

function fecha(iso: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}
