"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EV, track } from "@/lib/track";

/**
 * El botón que convierte a quien vio el reel en alguien que ha usado la app.
 *
 * Abre una mesa nueva con la cuenta del vídeo dentro y lleva a ella. No pide
 * nada —ni correo, ni instalar— porque el que llega viene de un vídeo y
 * cualquier paso de más lo pierde.
 */
export default function RepartirPlantilla({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function repartir() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/reparte/${slug}`, { method: "POST" });
      const data = (await response.json()) as { code?: string; error?: string };
      if (!response.ok || !data.code) {
        setBusy(false);
        setError(data.error ?? "No se ha podido abrir la mesa.");
        return;
      }
      track(EV.creaDivi, { metodo: "plantilla", origen: slug });
      // `busy` se queda puesto: entre esto y la mesa hay una navegación, y
      // devolver el botón a su sitio durante ese rato parece que no ha pasado nada.
      router.push(`/t/${data.code}`);
    } catch {
      setBusy(false);
      setError("No hay conexión. Inténtalo otra vez.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={repartir}
        disabled={busy}
        className="w-full rounded-xl bg-amber px-5 py-4 text-base font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Abriendo la mesa…" : "Repartir esta cuenta"}
      </button>
      {/* Corta a propósito: con el espaciado de la tipografía de ticket, esta
          línea partida en dos se lee descentrada. */}
      <p className="stamp mt-3 text-center text-ink-faint">Sin registro · la mesa es tuya</p>
      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
