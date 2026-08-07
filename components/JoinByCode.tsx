"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError("El código tiene al menos 4 caracteres.");
      return;
    }
    setChecking(true);
    setError(null);
    const response = await fetch(`/api/tickets/${clean}`);
    setChecking(false);
    if (!response.ok) {
      setError("No encuentro esa comanda. Revisa el código del ticket.");
      return;
    }
    router.push(`/t/${clean}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="A7K3P9"
        maxLength={10}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label="Código de la comanda"
        className="tnum min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 text-lg tracking-[0.25em] placeholder:text-ink-faint focus:border-amber focus:outline-none"
      />
      <button
        type="submit"
        disabled={checking}
        className="shrink-0 rounded-xl bg-paper-3 px-5 font-semibold transition-colors hover:bg-amber hover:text-paper disabled:opacity-50"
      >
        {checking ? "…" : "Entrar"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-clay">
          {error}
        </p>
      )}
    </form>
  );
}
