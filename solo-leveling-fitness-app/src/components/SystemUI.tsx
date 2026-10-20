"use client";

import type { ReactNode } from "react";
import { RANK_META, type RankLetter } from "@/lib/game";

export type Tone = "sys" | "danger" | "gold" | "violet" | "magenta";

const TONE_COLOR: Record<Tone, string> = {
  sys: "#3fd2ff",
  danger: "#ff2f45",
  gold: "#ffd166",
  violet: "#b388ff",
  magenta: "#ff45d0",
};

export function SysWindow({
  title,
  tag,
  tone = "sys",
  right,
  children,
  className = "",
  bodyClass = "",
}: {
  title: string;
  tag?: string;
  tone?: Tone;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section
      className={`sys-window sys-corners ${className}`}
      style={{ ["--tone" as string]: TONE_COLOR[tone] }}
    >
      <header className="sys-head">
        <span className="inline-block h-1.5 w-1.5 blink" style={{ background: TONE_COLOR[tone] }} />
        <span className="truncate">{title}</span>
        {tag ? <span className="sys-tag ml-auto hidden sm:inline-block">{tag}</span> : null}
        {right ? <span className="ml-auto font-mono text-[0.6rem] tracking-widest">{right}</span> : null}
      </header>
      <div className={`sys-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function SysButton({
  children,
  tone = "sys",
  solid = false,
  ghost = false,
  className = "",
  ...rest
}: {
  children: ReactNode;
  tone?: Tone;
  solid?: boolean;
  ghost?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    "sys-btn",
    solid ? "sys-btn-solid" : "",
    tone === "danger" ? "sys-btn-danger" : "",
    ghost ? "sys-btn-ghost" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      {...rest}
      className={cls}
      style={{ ["--tone" as string]: TONE_COLOR[tone] }}
    >
      {children}
    </button>
  );
}

export function SysBar({
  pct,
  tone = "sys",
  danger = false,
  className = "",
}: {
  pct: number;
  tone?: Tone;
  danger?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`sys-bar ${danger ? "sys-bar-danger" : ""} ${className}`}
      style={{ ["--tone" as string]: TONE_COLOR[tone] }}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Row({
  label,
  value,
  tone = "sys",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-sys/10 py-1.5 last:border-0">
      <span className="sys-label">{label}</span>
      <span
        className="font-mono text-[0.82rem] tracking-wider"
        style={{ color: TONE_COLOR[tone] }}
      >
        {value}
      </span>
    </div>
  );
}

export function SectionTitle({ children, tone = "sys" }: { children: ReactNode; tone?: Tone }) {
  return (
    <div
      className="mb-2 flex items-center gap-2 font-display text-[0.66rem] tracking-[0.28em] uppercase"
      style={{ color: TONE_COLOR[tone] }}
    >
      <span className="h-px w-4" style={{ background: TONE_COLOR[tone] }} />
      {children}
    </div>
  );
}

export function RankEmblem({
  letter,
  size = 96,
  active = true,
}: {
  letter: RankLetter;
  size?: number;
  active?: boolean;
}) {
  const color = RANK_META[letter].color;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rotate-45 border"
        style={{
          borderColor: active ? color : "rgba(120,160,180,.4)",
          boxShadow: active ? `0 0 22px ${color}66, inset 0 0 26px ${color}22` : "none",
        }}
      />
      <div
        className="absolute inset-[14%] rotate-45 border"
        style={{ borderColor: active ? `${color}99` : "rgba(120,160,180,.25)" }}
      />
      <div
        className="absolute inset-0 grid place-items-center font-display font-black"
        style={{
          fontSize: size * 0.42,
          color: active ? "#eafaff" : "#4d6b7a",
          textShadow: active ? `0 0 18px ${color}` : "none",
        }}
      >
        {letter}
      </div>
      {active ? (
        <div
          className="pulse-ring absolute inset-0 rotate-45 border"
          style={{ borderColor: color }}
        />
      ) : null}
    </div>
  );
}

export function Glyph({ d, tone = "sys", size = 20 }: { d: string; tone?: Tone; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={TONE_COLOR[tone]}
      strokeWidth="1.8"
      strokeLinecap="square"
    >
      <path d={d} />
    </svg>
  );
}

export function Divider({ tone = "sys" }: { tone?: Tone }) {
  return (
    <div
      className="my-3 h-px w-full"
      style={{
        background: `linear-gradient(90deg, ${TONE_COLOR[tone]}00, ${TONE_COLOR[tone]}66, ${TONE_COLOR[tone]}00)`,
      }}
    />
  );
}

export function StatusPill({ text, tone = "sys" }: { text: string; tone?: Tone }) {
  return (
    <span
      className="border px-2 py-0.5 font-mono text-[0.6rem] tracking-[0.18em] uppercase"
      style={{
        color: TONE_COLOR[tone],
        borderColor: `${TONE_COLOR[tone]}66`,
        background: `${TONE_COLOR[tone]}12`,
      }}
    >
      {text}
    </span>
  );
}

export function GoalCheck({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <span
      className={`grid h-4 w-4 shrink-0 place-items-center border font-mono text-[0.6rem] ${
        done ? "border-sys bg-sys/25 text-white" : "border-sys/40 text-transparent"
      }`}
    >
      ✓
    </span>
  );
}
