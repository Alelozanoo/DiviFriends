/**
 * DiviFriends · la hoja de registros.
 *
 * Pegar entero en Extensiones → Apps Script de la hoja de cálculo, cambiar
 * SECRETO por una cadena larga al azar (la misma que se guarda en la app como
 * HOJA_REGISTROS_SECRETO) y desplegar como aplicación web:
 *
 *   Implementar → Nueva implementación → Tipo: Aplicación web
 *   Ejecutar como: yo · Quién tiene acceso: Cualquier usuario
 *
 * La URL que da (…/exec) es HOJA_REGISTROS_URL en la app. Cada vez que
 * alguien acepta los términos, marca o desmarca las novedades, o borra su
 * cuenta, la app hace un POST aquí y la fila de ese correo se pone al día.
 *
 * Columnas: Correo · Nombre · Términos · Fecha términos · Novedades · Actualizado
 * El correo es la clave: una persona, una fila. El usuario @así no se apunta
 * a propósito, porque cambia.
 */
const SECRETO = "cámbiame-por-algo-largo-y-al-azar";
const HOJA = "Registros";
const CABECERA = ["Correo", "Nombre", "Términos", "Fecha términos", "Novedades", "Actualizado"];

function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return salida({ ok: false, error: "cuerpo" });
  }
  if (!datos || datos.secreto !== SECRETO) return salida({ ok: false, error: "secreto" });
  const correo = String(datos.correo || "").trim().toLowerCase();
  if (!correo) return salida({ ok: false, error: "correo" });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // dos altas a la vez no pueden escribir la misma fila
  try {
    const hoja = hojaRegistros();
    const fila = buscaFila(hoja, correo);

    if (datos.accion === "borrar") {
      // Cuenta borrada: fuera de la hoja también, que es lo que espera quien borra.
      if (fila) hoja.deleteRow(fila);
      return salida({ ok: true, borrado: Boolean(fila) });
    }

    const valores = [
      correo,
      String(datos.nombre || ""),
      datos.terminos ? "SÍ" : "NO",
      datos.terminos ? fecha(datos.terminos) : "",
      datos.novedades ? "SÍ" : "NO",
      fecha(datos.cuando || new Date().toISOString()),
    ];
    if (fila) hoja.getRange(fila, 1, 1, valores.length).setValues([valores]);
    else hoja.appendRow(valores);
    return salida({ ok: true, fila: fila || hoja.getLastRow() });
  } finally {
    lock.releaseLock();
  }
}

/** La pestaña, con su cabecera, creándola si es la primera vez. */
function hojaRegistros() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
    hoja.appendRow(CABECERA);
    hoja.getRange(1, 1, 1, CABECERA.length).setFontWeight("bold");
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/** El número de fila de ese correo, o null. */
function buscaFila(hoja, correo) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return null;
  const correos = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  for (let i = 0; i < correos.length; i++) {
    if (String(correos[i][0]).trim().toLowerCase() === correo) return i + 2;
  }
  return null;
}

/** «4/9/2026 10:32», en hora de Madrid. */
function fecha(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return Utilities.formatDate(d, "Europe/Madrid", "d/M/yyyy HH:mm");
}

function salida(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
