"use client";

import { initials } from "@/lib/format";

export function Avatar({
  name,
  color,
  size = 28,
  dimmed = false,
}: {
  name: string;
  color: string;
  size?: number;
  dimmed?: boolean;
}) {
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        background: dimmed ? "transparent" : color,
        borderColor: color,
        color: dimmed ? color : "#14100d",
        fontSize: size * 0.4,
      }}
      className="inline-grid shrink-0 place-items-center rounded-full border-2 font-bold leading-none"
    >
      {initials(name)}
    </span>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const color =
    tone === "good" ? "text-mint" : tone === "warn" ? "text-clay" : "text-ink";
  return (
    <div>
      <p className="stamp text-ink-faint">{label}</p>
      <p className={`tnum mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className="h-full rounded-full bg-amber transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
