"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import {
  ArrowRight,
  Vault,
  Split,
  TrendingUp,
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  Users,
  Activity,
  Layers,
  Target,
  Repeat,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import LiquidEther from "@/components/LiquidEther";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) {
      const controls = animate(motionVal, value, { duration: 2, ease: "easeOut" });
      return controls.stop;
    }
  }, [inView, motionVal, value]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return unsub;
  }, [rounded]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const steps = [
  {
    num: "01",
    title: "Deposit xSPY",
    desc: "Deposit your tokenized S&P 500 ETF (xSPY) into the pendleX vault smart contract.",
    icon: Vault,
  },
  {
    num: "02",
    title: "Receive Two Tokens",
    desc: "The vault mints xdSPY (income token) and xpSPY (price token), splitting yield from price exposure.",
    icon: Split,
  },
  {
    num: "03",
    title: "Trade or Earn",
    desc: "Trade each token on its dedicated market, or hold to earn predictable yield and leveraged returns.",
    icon: TrendingUp,
  },
];

const personas = [
  {
    icon: DollarSign,
    name: "Alice",
    title: "Income Investor",
    desc: "Buys xdSPY for steady dividend yield. Earns projected 12-16% APY without touching principal.",
  },
  {
    icon: BarChart3,
    name: "Bob",
    title: "Day Trader",
    desc: "Trades xpSPY during NYSE hours for leveraged price moves. 2-5x exposure with no liquidation risk on the underlying.",
  },
  {
    icon: Layers,
    name: "Carol",
    title: "Yield Stripper",
    desc: "Deposits xSPY, sells xpSPY to lock in above-market fixed yield, keeps the income stream.",
  },
  {
    icon: Repeat,
    name: "Dave",
    title: "Arbitrageur",
    desc: "Exploits price dislocations between xdSPY + xpSPY and the underlying xSPY to pocket risk-free spreads.",
  },
];

const stats = [
  { label: "Total Value Locked", value: 48, suffix: "M", prefix: "$" },
  { label: "24h Volume", value: 12, suffix: "M", prefix: "$" },
  { label: "xdSPY APY", value: 14, suffix: "%", prefix: "" },
  { label: "Active Sessions", value: 1842, suffix: "", prefix: "" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* ----------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-[#0a0a0a]">
        <div className="pointer-events-none absolute inset-0 z-0">
          <LiquidEther
            colors={["#141414", "#c8ff00", "#3d5200"]}
            resolution={0.45}
            mouseForce={18}
            autoSpeed={0.45}
          />
        </div>
        {/* Radial fade for legibility */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_15%,#0a0a0a_72%)]" />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8 lg:pt-44 lg:pb-32">
          {/* Floating badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8 flex gap-3"
          >
            <Badge
              variant="outline"
              className="border-[#c8ff00]/30 bg-[#c8ff00]/5 text-[#c8ff00] px-3 py-1"
            >
              xdSPY -- Income
            </Badge>
            <Badge
              variant="outline"
              className="border-[#c8ff00]/30 bg-[#c8ff00]/5 text-[#c8ff00] px-3 py-1"
            >
              xpSPY -- Price
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="font-[family-name:var(--font-safira)] text-5xl leading-tight tracking-tight sm:text-7xl lg:text-8xl"
          >
            Split. Trade.{" "}
            <span className="text-[#c8ff00] glow-lime-text">Earn.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-4 text-lg font-medium text-muted-foreground sm:text-xl"
          >
            Two tokens. Two markets. One vault.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground"
          >
            pendleX splits tokenized ETFs into income tokens and price tokens,
            unlocking predictable yield and clean leveraged exposure -- all
            on-chain, all composable.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/app"
              className={buttonVariants({ size: "lg", className: "bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80 font-semibold px-6" })}
            >
              Launch App
              <ArrowRight className="ml-1 size-4" />
            </Link>
            <Link
              href="https://docs.pendlex.io"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Read Docs
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* How It Works                                                      */}
      {/* ----------------------------------------------------------------- */}
      <Section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            How It Works
          </Badge>
          <h2 className="font-[family-name:var(--font-safira)] text-3xl sm:text-4xl">
            Three steps to split
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
              >
                <Card className="relative h-full border-l-2 border-l-[#c8ff00]/40 bg-card/60">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-safira)] text-2xl text-[#c8ff00]">
                        {step.num}
                      </span>
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-2 text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Token Architecture                                                */}
      {/* ----------------------------------------------------------------- */}
      <Section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            Token Architecture
          </Badge>
          <h2 className="font-[family-name:var(--font-safira)] text-3xl sm:text-4xl">
            Two tokens, two strategies
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* xdSPY */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <Card className="h-full border-t-2 border-t-[#c8ff00]/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#c8ff00]/10">
                    <DollarSign className="size-5 text-[#c8ff00]" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs">
                      xdSPY
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-3 text-xl">Income Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Captures all dividend distributions from the underlying ETF.
                  Trade 24/7 on the pendleX income market with deep liquidity.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Projected APY</p>
                    <p className="mt-1 text-lg font-semibold text-[#c8ff00]">
                      12-16%
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Trading</p>
                    <p className="mt-1 text-lg font-semibold">24/7</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="mr-1 size-3" /> Continuous
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Target className="mr-1 size-3" /> Dividend Yield
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* xpSPY */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <Card className="h-full border-t-2 border-t-[#c8ff00]/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#c8ff00]/10">
                    <TrendingUp className="size-5 text-[#c8ff00]" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs">
                      xpSPY
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-3 text-xl">Price Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Pure price exposure to the S&P 500, stripped of dividends.
                  Trade during NYSE hours with built-in leveraged returns.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Leverage</p>
                    <p className="mt-1 text-lg font-semibold text-[#c8ff00]">
                      2-5x
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Trading</p>
                    <p className="mt-1 text-lg font-semibold">NYSE Hours</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="mr-1 size-3" /> Leveraged
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <BarChart3 className="mr-1 size-3" /> Price Exposure
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* For Every Trader                                                  */}
      {/* ----------------------------------------------------------------- */}
      <Section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            Use Cases
          </Badge>
          <h2 className="font-[family-name:var(--font-safira)] text-3xl sm:text-4xl">
            For every trader
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="h-full bg-card/60">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#c8ff00]/10">
                      <Icon className="size-5 text-[#c8ff00]" />
                    </div>
                    <CardTitle className="mt-2">
                      {p.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        -- {p.title}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {p.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Live Stats                                                        */}
      {/* ----------------------------------------------------------------- */}
      <Section className="border-y border-border bg-card/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-20 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <p className="font-[family-name:var(--font-safira)] text-3xl sm:text-4xl text-foreground">
                {s.prefix}
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* CTA Banner                                                        */}
      {/* ----------------------------------------------------------------- */}
      <Section className="relative overflow-hidden bg-grid">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0a0a0a_70%)]" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-32 text-center sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-safira)] text-4xl sm:text-5xl">
            Ready to{" "}
            <span className="text-[#c8ff00] glow-lime-text">split?</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Start splitting tokenized ETFs into income and price tokens today.
          </p>
          <div className="mt-10">
            <Link
              href="/app"
              className={buttonVariants({ size: "lg", className: "bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80 font-semibold px-8" })}
            >
              Launch App
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}
