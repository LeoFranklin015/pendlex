"use client";

import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

/** Title slide: xStock splits into dx + px (div connectors only) */
export function AnimSplitTokens() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10">
      <div className="flex w-full items-center justify-center gap-3 sm:gap-5 md:gap-8">
        <motion.div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[10px] sm:text-xs"
          style={{
            borderColor: "rgba(200,255,0,0.6)",
            backgroundColor: "rgba(200,255,0,0.08)",
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, type: "spring", stiffness: 140, damping: 16 }}
        >
          <span className="font-medium text-accent">dx</span>
        </motion.div>

        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          <motion.div
            className="h-0.5 flex-1 rounded-full bg-accent/50"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
            style={{ transformOrigin: "right center" }}
          />
          <motion.div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-white/[0.04] font-mono text-xs text-white/50"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55 }}
          >
            xStock
          </motion.div>
          <motion.div
            className="h-0.5 flex-1 rounded-full bg-white/25"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
            style={{ transformOrigin: "left center" }}
          />
        </div>

        <motion.div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-white/[0.06] font-mono text-[10px] text-white/80 sm:text-xs"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, type: "spring", stiffness: 140, damping: 16 }}
        >
          px
        </motion.div>
      </div>

      <motion.p
        className="font-mono text-[10px] text-white/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        one deposit, two instruments
      </motion.p>
    </div>
  );
}

/** Problem: status quo vs protocol */
export function AnimProblemBars() {
  const bars = [
    { h: 72, key: "a" },
    { h: 88, key: "b" },
    { h: 95, key: "c" },
  ];
  return (
    <div className="flex w-full max-w-md gap-6">
      <div className="flex flex-1 flex-col items-center gap-2">
        <span className="w-full text-left font-mono text-[10px] uppercase tracking-widest text-red-400/90">
          today
        </span>
        <div className="flex h-40 w-full items-end justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
          {bars.map((b, i) => (
            <motion.div
              key={b.key}
              className="w-5 rounded-t bg-red-500/50"
              initial={{ height: 4 }}
              whileInView={{ height: `${b.h}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 * i, duration: 0.55, ease: "easeOut" }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center gap-2">
        <span className="w-full text-left font-mono text-[10px] uppercase tracking-widest text-accent">
          {APP_NAME}
        </span>
        <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.05] p-4">
          <motion.div
            className="h-24 w-24 rounded-full border-2 border-dashed border-accent/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}

function ArchNode({
  label,
  accent: isAccent,
}: {
  label: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      className={`rounded-xl border px-3 py-2 font-mono text-[9px] text-white/75 sm:text-[10px] ${
        isAccent
          ? "border-accent/35 bg-accent/[0.06] text-white/90"
          : "border-white/10 bg-white/[0.04]"
      }`}
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      {label}
    </motion.div>
  );
}

/** Architecture: div lines + nodes (no SVG) */
export function AnimArchitectureFlow() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-0">
      <ArchNode label="Users" />

      <motion.div
        className="h-10 w-px bg-gradient-to-b from-white/30 to-accent/40"
        initial={{ scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        style={{ transformOrigin: "top center" }}
      />

      <div className="flex w-full items-start justify-between gap-2 px-1 sm:gap-4">
        <div className="flex flex-1 flex-col items-center gap-2">
          <ArchNode label="Vault" accent />
          <motion.div
            className="h-8 w-px bg-accent/45"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.3 }}
            style={{ transformOrigin: "top center" }}
          />
          <ArchNode label="Pyth" accent />
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 pt-10 sm:pt-12">
          <ArchNode label="Exchange" />
          <motion.div
            className="h-8 w-px bg-white/20"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.3 }}
            style={{ transformOrigin: "top center" }}
          />
          <ArchNode label="Keeper" />
        </div>
      </div>

      <motion.div
        className="pointer-events-none mt-2 flex items-center gap-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="font-mono text-[10px] text-white/35">Base + Pyth pull</span>
      </motion.div>
    </div>
  );
}

/** APY number spring */
export function AnimApyMeter({
  target = 14,
  className,
}: {
  target?: number;
  className?: string;
}) {
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 90, damping: 22 });
  const [display, setDisplay] = useState(0);

  useMotionValueEvent(spring, "change", (v) => {
    setDisplay(Math.round(v));
  });

  useEffect(() => {
    raw.set(0);
    const id = requestAnimationFrame(() => raw.set(target));
    return () => cancelAnimationFrame(id);
  }, [raw, target]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="font-[family-name:var(--font-safira)] text-6xl tabular-nums text-accent md:text-7xl">
        {display}
      </span>
      <span className="font-mono text-xs text-white/40">est. dx APY mid (%)</span>
    </div>
  );
}

/** Vault: accumulator pulse */
export function AnimAccumulatorPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-full max-w-md items-center justify-center",
        className
      )}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-accent/30"
          style={{ width: 60 + i * 48, height: 60 + i * 48 }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.45, 0.15] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.35,
            ease: "easeInOut",
          }}
        />
      ))}
      <span className="relative z-10 font-mono text-xs text-white/50">
        accDivPerShare 1e36
      </span>
    </div>
  );
}

/** Roadmap phases */
export function AnimPhaseDots({ active = 3 }: { active?: number }) {
  const phases = ["0", "1", "2", "3", "4", "5", "6"];
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {phases.map((p, i) => (
        <motion.div
          key={p}
          className={`h-2 rounded-full ${
            i === active ? "w-8 bg-accent" : "w-2 bg-white/20"
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06 * i }}
        />
      ))}
    </div>
  );
}
