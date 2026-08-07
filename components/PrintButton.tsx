"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber"
    >
      Imprimir
    </button>
  );
}
