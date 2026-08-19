"use client";

import { useEffect } from "react";
import { olvidar } from "@/lib/misDivis";

/**
 * Quita de «tus divis» una comanda que ya no existe.
 *
 * Esa lista vive en el móvil y no sabe nada del servidor, así que desde que
 * las mesas caducan a los treinta días se quedaría con entradas muertas: tocas
 * una cena de hace dos meses y sales a una pantalla de «esto no existe», pero
 * la fila sigue ahí para volver a tropezar mañana.
 *
 * Se monta sólo en esa pantalla, que es la única prueba de que la comanda se
 * ha ido de verdad — un fallo de red no llega hasta aquí.
 */
export default function OlvidarComanda({ code }: { code: string }) {
  useEffect(() => {
    olvidar(code);
  }, [code]);

  return null;
}
