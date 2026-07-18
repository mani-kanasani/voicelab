// Neomorphic motion + display primitives.
//
// Shared building blocks for the soft-UI layer so every screen animates the
// same way from one place: a deterministic count-up, an entrance stagger, a
// radial gauge, an inline sparkline, and a pulse dot. Every animation here is
// gated on prefers-reduced-motion (via framer-motion's useReducedMotion) —
// motion-reduced users get the final state instantly.

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Count-up ────────────────────────────────────────────────────────────────

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Deterministic requestAnimationFrame count-up. Ease-out over `durationMs`.
 *
 * Intentionally NOT a framer-motion spring driven by `duration` — under current
 * framer-motion that tween silently never progresses and renders a permanent 0.
 * Pass `target = null | undefined` while the real value is still loading; the
 * hook holds at 0 and callers should render an em dash instead (see NeoNumber).
 */
export function useCountUp(target: number | null | undefined, durationMs = 900): number {
  const reduce = useReducedMotion();
  const [value, setValue] = React.useState<number>(target ?? 0);
  const displayed = React.useRef<number>(target ?? 0);

  React.useEffect(() => {
    if (target == null) return;
    if (reduce) {
      displayed.current = target;
      setValue(target);
      return;
    }
    const from = displayed.current;
    const to = target;
    if (from === to) return;
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      const v = from + (to - from) * easeOutCubic(p);
      displayed.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduce]);

  return value;
}

/**
 * A count-up number. Renders an em dash (never a fake animated 0) while the
 * value is loading (`value == null`). `format` receives the tweened value.
 */
export function NeoNumber({
  value,
  format,
  durationMs,
  className,
}: {
  value: number | null | undefined;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const animated = useCountUp(value ?? null, durationMs);
  if (value == null) return <span className={cn("tabular-nums", className)}>—</span>;
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
  return <span className={cn("tabular-nums", className)}>{fmt(animated)}</span>;
}

// ── Entrance stagger ─────────────────────────────────────────────────────────
// Spread {...staggerContainer} on a wrapper and wrap each child in
// <motion.div variants={staggerItem}>. Children fade + rise, delayed by index.
// framer-motion drops the transform instantly under reduced-motion.

export const staggerContainer = {
  initial: "hidden",
  animate: "show",
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  } as Variants,
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ── Tone palette (existing hues only) ────────────────────────────────────────

export type NeoTone = "brand" | "success" | "warning" | "hot" | "info";

const TONE: Record<NeoTone, { color: string; chipFrom: string; chipTo: string; text: string }> = {
  brand:   { color: "#6B4EFF", chipFrom: "from-brand/20",     chipTo: "to-brand-pale",       text: "text-brand"    },
  success: { color: "#10B981", chipFrom: "from-success/20",   chipTo: "to-success-soft",     text: "text-success"  },
  warning: { color: "#F59E0B", chipFrom: "from-warning/20",   chipTo: "to-warning-soft",     text: "text-warning"  },
  hot:     { color: "#FF4D4D", chipFrom: "from-hot-lead/15",  chipTo: "to-hot-lead/5",       text: "text-hot-lead" },
  info:    { color: "#3B82F6", chipFrom: "from-info/20",      chipTo: "to-info-soft",        text: "text-info"     },
};

// ── Pulse status dot ─────────────────────────────────────────────────────────

export function NeoDot({ tone = "success", className }: { tone?: NeoTone; className?: string }) {
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full animate-neo-dot", className)}
      style={{ background: TONE[tone].color }}
    />
  );
}

// ── Radial gauge ─────────────────────────────────────────────────────────────
// SVG ring that animates strokeDashoffset. The center is a count-up number; the
// caption should state a real comparison — never fabricate a metric.

export function NeoGauge({
  value,
  max = 100,
  size = 92,
  stroke = 9,
  tone = "brand",
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: NeoTone;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circ * (1 - pct);
  const c = TONE[tone].color;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(var(--neo-sh), 0.45)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? offset : circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 5px ${c}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
// Hand-rolled inline SVG: the line draws in via pathLength, a soft area gradient
// fades in, and the latest point gets a glowing dot.

export function NeoSparkline({
  points,
  width = 132,
  height = 40,
  tone = "brand",
  className,
}: {
  points: number[];
  width?: number;
  height?: number;
  tone?: NeoTone;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const c = TONE[tone].color;
  const gid = React.useId();

  if (!points || points.length < 2) {
    return <div className={cn("neo-inset rounded-lg", className)} style={{ width, height }} />;
  }

  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (points.length - 1);
  const xy = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (p - min) / span);
    return [x, y] as const;
  });
  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${height - pad} L${xy[0][0].toFixed(1)},${height - pad} Z`;
  const [lx, ly] = xy[xy.length - 1];

  return (
    <svg width={width} height={height} className={className} role="img" aria-hidden>
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.22} />
          <stop offset="100%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#spark-${gid})`}
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.3 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
      />
      <circle cx={lx} cy={ly} r={2.6} fill={c} style={{ filter: `drop-shadow(0 0 4px ${c})` }} />
    </svg>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
// The canonical raised stat tile: a neo-chip icon well, a count-up value, an
// optional caption. Pass a numeric `value` for the count-up, or a preformatted
// `display` string when the value isn't numeric. Meant to be a child of a
// {...staggerContainer} grid (wrap in motion via `staggerItem` at the call site,
// or set `stagger` to self-wrap).

export function NeoTile({
  icon: Icon,
  label,
  value,
  display,
  format,
  caption,
  tone = "brand",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value?: number | null;
  display?: React.ReactNode;
  format?: (n: number) => string;
  caption?: React.ReactNode;
  tone?: NeoTone;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div className={cn("neo-raised neo-interactive p-4", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-caption text-text-muted">{label}</div>
        {Icon && (
          <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br", t.chipFrom, t.chipTo)}>
            <Icon size={16} className={t.text} />
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-text-primary font-mono tracking-tight tabular-nums">
        {display ?? <NeoNumber value={value} format={format} />}
      </div>
      {caption && <div className="text-small text-text-muted mt-1">{caption}</div>}
    </div>
  );
}
