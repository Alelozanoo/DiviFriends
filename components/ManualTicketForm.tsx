"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money, parseMoney } from "@/lib/format";
import { EV, track } from "@/lib/track";

interface Row {
  key: string;
  name: string;
  qty: string;
  price: string;
}

const EMPTY = (): Row => ({ key: crypto.randomUUID(), name: "", qty: "1", price: "" });

const DEMO: Row[] = [
  { key: "d1", name: "Croquetas de jamón", qty: "2", price: "4,90" },
  { key: "d2", name: "Ensaladilla rusa", qty: "1", price: "7,50" },
  { key: "d3", name: "Caña", qty: "3", price: "2,50" },
  { key: "d4", name: "Pulpo a la brasa", qty: "1", price: "18,90" },
  { key: "d5", name: "Tarta de queso", qty: "2", price: "5,50" },
];

export default function ManualTicketForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [place, setPlace] = useState(demo ? "Bar Casa Nuria" : "");
  const [tableLabel, setTableLabel] = useState(demo ? "Mesa 12" : "");
  const [rows, setRows] = useState<Row[]>(demo ? DEMO : [EMPTY(), EMPTY(), EMPTY()]);
  const [total, setTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sumCents = useMemo(
    () =>
      rows.reduce((acc, row) => {
        const qty = Math.max(1, Number(row.qty) || 1);
        return acc + parseMoney(row.price) * qty;
      }, 0),
    [rows],
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const items = rows
      .filter((row) => row.name.trim() && parseMoney(row.price) > 0)
      .map((row) => ({
        name: row.name.trim(),
        qty: Math.max(1, Number(row.qty) || 1),
        unitPrice: row.price,
      }));

    if (items.length === 0) {
      setError("Añade al menos una consumición con precio.");
      return;
    }

    setBusy(true);
    setError(null);
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ place, tableLabel, currency: "EUR", items, total: total || null }),
    });
    const data = (await response.json()) as { code?: string; error?: string };
    setBusy(false);

    if (!response.ok || !data.code) {
      setError(data.error ?? "No se ha podido crear la comanda.");
      return;
    }
    track(EV.creaDivi, { metodo: "mano" });
    router.push(`/t/${data.code}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bar o restaurante">
          <input
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Bar Casa Nuria"
            className="w-full rounded-xl border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
          />
        </Field>
        <Field label="Mesa">
          <input
            value={tableLabel}
            onChange={(event) => setTableLabel(event.target.value)}
            placeholder="Mesa 12"
            className="w-full rounded-xl border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-line bg-paper-2 p-4">
        <p className="stamp mb-3 text-ink-faint">Consumiciones</p>

        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex gap-2">
              <input
                value={row.qty}
                onChange={(event) => update(row.key, { qty: event.target.value })}
                inputMode="numeric"
                aria-label="Cantidad"
                className="tnum w-14 rounded-xl border border-line bg-paper px-2 py-3 text-center focus:border-amber focus:outline-none"
              />
              <input
                value={row.name}
                onChange={(event) => update(row.key, { name: event.target.value })}
                placeholder="Croquetas"
                aria-label="Nombre del plato"
                className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
              />
              <input
                value={row.price}
                onChange={(event) => update(row.key, { price: event.target.value })}
                inputMode="decimal"
                placeholder="4,90"
                aria-label="Precio por unidad"
                className="tnum w-24 rounded-xl border border-line bg-paper px-3 py-3 text-right focus:border-amber focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                aria-label="Quitar línea"
                className="shrink-0 rounded-xl px-2 text-ink-faint transition-colors hover:text-clay"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, EMPTY()])}
          className="mt-3 w-full rounded-xl border border-dashed border-line py-3 text-sm font-semibold text-ink-faint transition-colors hover:border-amber hover:text-amber"
        >
          + Otra línea
        </button>

        <div className="rule my-4" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">
            Suma de líneas: <span className="tnum font-bold text-ink">{money(sumCents)}</span>
          </span>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Total del ticket
            <input
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              inputMode="decimal"
              placeholder={(sumCents / 100).toFixed(2).replace(".", ",")}
              aria-label="Total del ticket con impuestos y servicio"
              className="tnum w-28 rounded-xl border border-line bg-paper px-3 py-2.5 text-right focus:border-amber focus:outline-none"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Déjalo vacío si el total coincide con la suma. Si el ticket lleva servicio o impuestos
          aparte, escribe aquí el total real y se repartirá en proporción.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-amber py-4 text-lg font-semibold text-paper transition-colors hover:bg-ink disabled:opacity-50"
      >
        {busy ? "Creando…" : "Crear comanda"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="stamp mb-2 block text-ink-faint">{label}</span>
      {children}
    </label>
  );
}
