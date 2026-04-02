"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Vault,
  Split,
  TrendingUp,
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  Layers,
  Target,
  Repeat,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Globe from "@/components/ui/globe";
import CoreTechnology from "@/components/landing/CoreTechnology";

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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const steps = [
  {
    num: "01",
    title: "Deposit xStock",
    desc: "Lock a registered xStock (for example AAPL, NVDA, or SPY) in the vault. One deposit, two claims on the same underlying.",
    icon: Vault,
  },
  {
    num: "02",
    title: "Mint dx + px",
    desc: "The vault mints matching dx (dividend rights) and px (principal). Yield accrues to dx; px tracks price for the session-bound exchange.",
    icon: Split,
  },
  {
    num: "03",
    title: "Route to your market",
    desc: "Hold or trade dx against the dividend schedule 24/7. Trade px with USDC collateral when the equity session is open. Recombine to exit.",
    icon: TrendingUp,
  },
];

const personas = [
  {
    icon: DollarSign,
    name: "Alice",
    title: "Income investor",
    desc: "Wants dividend flow without riding every tick of the equity. Buys dx and lets rebases accrue to dx holders, not px.",
  },
  {
    icon: BarChart3,
    name: "Bob",
    title: "Session trader",
    desc: "Wants clean price exposure when the cash market is open, without carrying dividend mechanics on intraday px positions.",
  },
  {
    icon: Layers,
    name: "Carol",
    title: "Yield stripper",
    desc: "Splits xStock, sells px for USDC, keeps dx to capture the dividend stream at a basis shaped by the strip.",
  },
  {
    icon: Repeat,
    name: "Dave",
    title: "Arbitrageur",
    desc: "Watches dx + px versus xStock. Recombines when the bundle is cheap, splits when it is rich, keeping pools aligned.",
  },
];

const stats = [
  { label: "Assets live", value: "8 xStocks" },
  { label: "dx market", value: "24/7" },
  { label: "px exchange", value: "NYSE hours" },
  { label: "Price oracle", value: "Pyth" },
];

const faqs = [
  {
    q: "What are dx and px tokens?",
    a: "When you deposit an xStock into the vault, it mints two tokens: dx (dividend token) captures all dividend rebases and trades 24/7, while px (principal token) gives you leveraged price exposure during NYSE trading hours. Together they always equal one xStock.",
  },
  {
    q: "How do I get started?",
    a: "Connect your wallet, deposit a supported xStock (like AAPL, NVDA, or SPY) into the vault, and receive your dx and px tokens. You can then hold for yield, trade on the exchange, or recombine anytime to withdraw the underlying.",
  },
  {
    q: "When can I trade px tokens?",
    a: "px tokens trade against USDC only during NYSE market hours (Monday-Friday, 9:30 AM - 4:00 PM ET). This session-gating ensures price exposure aligns with the underlying equity market. dx tokens trade 24/7 with no session restrictions.",
  },
  {
    q: "What happens to dividends?",
    a: "Dividends flow through the vault's accumulator system exclusively to dx holders. px holders receive zero dividend exposure -- that is the entire point of the split. This lets income investors isolate yield from price volatility.",
  },
  {
    q: "Can I recombine dx + px back into xStock?",
    a: "Yes. Burn equal amounts of dx and px tokens to redeem the underlying xStock at any time. A small recombination fee (0.05%) applies. Arbitrageurs keep the dx + px bundle priced close to the underlying.",
  },
  {
    q: "What chains is xStream deployed on?",
    a: "xStream is currently live on Ink Sepolia and Ethereum Sepolia testnets with 8 tokenized assets: TSLA, NVDA, GOOGL, AAPL, SPY, TBLL, GLD, and SLV. Connect any EVM-compatible wallet to get started.",
  },
  {
    q: "What are the fees?",
    a: "Mint/burn: 0.05% of notional. Session settlement: 0.1% of notional. Borrowing: 0.01% per hour of borrowed notional. 80% of all protocol fees flow to dx holders as additional yield; 20% goes to the protocol treasury.",
  },
  {
    q: "Is the protocol audited?",
    a: "Smart contracts are currently undergoing audit. The protocol is live on testnet for community testing. Always treat DeFi protocols as experimental software and never deposit more than you can afford to lose.",
  },
];

// ---------------------------------------------------------------------------
// FAQ Accordion Item
// ---------------------------------------------------------------------------

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="border-b border-black/[0.06] last:border-b-0"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-sm font-medium text-foreground sm:text-base group-hover:text-primary transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180 text-primary" : ""

            }`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
          {a}
        </p>
      </motion.div>
    </motion.div>
  );
}

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
      <section className="relative overflow-hidden bg-background">
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 ">
          <div className="mb-24 flex flex-col text-center justify-start items-start lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-6 flex flex-wrap justify-center gap-2 sm:gap-3 lg:justify-start"
            >
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 px-3 py-1 font-mono text-primary"
              >
                dx = dividend rights
              </Badge>
              <Badge
                variant="outline"
                className="border-black/15 bg-black/[0.03] px-3 py-1 font-mono text-muted-foreground"
              >
                px = principal / price
              </Badge>
              <Badge
                variant="outline"
                className="border-black/15 bg-black/[0.03] px-3 py-1 text-xs text-muted-foreground"
              >
                Ink + Ethereum Sepolia
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.7 }}
              className="font-[family-name:var(--font-safira)] text-4xl leading-[1.08] tracking-tight  md:text-6xl"
            >
              <span className="text-primary glow-lime-text">Yield </span>
              tokenization for capital efficiency
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-5 max-w-xl text-base font-medium leading-snug text-muted-foreground sm:text-lg lg:max-w-lg"
            >
              Split one xStock into dx (dividend rights) and px (session-bound
              price). Lean into yield or hedge it, trade each leg, then recombine
              to redeem. 8 assets live on Ink Sepolia and Ethereum Sepolia.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
            >
              <Link
                href="/app"
                className={buttonVariants({ size: "lg", className: "bg-primary text-primary-foreground hover:bg-primary/80 font-semibold px-6" })}
              >
                Open app
                <ArrowRight className="ml-1 size-4" />
              </Link>
              <Link
                href="/docs"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Protocol docs
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.65, ease: "easeOut" }}
            className="flex w-full justify-center lg:justify-end lg:pl-4"
            aria-hidden
          >
            <Globe className="w-full max-w-[min(100%,560px)] lg:max-w-[min(100%,640px)]" />
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
            From one xStock to two tokens
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Dividend-tokenization separates the right to upcoming dividends from
            principal. Here that split is dx (yield) and px (price), routed
            through the vault and markets below.
          </p>
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
                <Card className="relative h-full border-l-2 border-l-primary/40 bg-card/60 py-4">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-safira)] text-2xl text-primary">
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
      {/* Core Technology                                                   */}
      {/* ----------------------------------------------------------------- */}
      <CoreTechnology />

      {/* ----------------------------------------------------------------- */}
      {/* Token Architecture                                                */}
      {/* ----------------------------------------------------------------- */}
      <Section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            Token Architecture
          </Badge>
          <h2 className="font-[family-name:var(--font-safira)] text-3xl sm:text-4xl">
            Two tokens, two liquidity regimes
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
            <Card className="h-full border-t-2 border-t-primary/60 py-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="size-5 text-primary" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs font-mono">
                      dx
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-3 text-xl">Dividend token (dx)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Rebases flow through the vault into dx via an accumulator: px
                  balances do not eat the dividend. Secondary liquidity prices
                  dx against the known schedule and the recombination floor.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Yield</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      Rebase-linked
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Liquidity</p>
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
            <Card className="h-full border-t-2 border-t-primary/60 py-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="size-5 text-primary" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs font-mono">
                      px
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-3 text-xl">Principal token (px)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  px is the levered, session-gated leg: long or short against
                  USDC while the equity session is open, with Pyth marking spot.
                  Positions are not perpetuals; they roll with the protocol&apos;s
                  daily cadence.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Exposure</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      Leveraged spot
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Session</p>
                    <p className="mt-1 text-lg font-semibold">NYSE</p>
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
                <Card className="h-full bg-card/60 py-4">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <CardTitle className="mt-2">
                      {p.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({p.title})
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
      {/* Protocol facts                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Section className="border-y border-border bg-card/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-20 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <p className="font-[family-name:var(--font-safira)] text-xl leading-tight text-foreground sm:text-2xl">
                {s.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* FAQ                                                               */}
      {/* ----------------------------------------------------------------- */}
      <Section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <HelpCircle className="size-4 text-primary" />
              </div>
              <Badge variant="secondary">FAQ</Badge>
            </div>
            <h2 className="font-[family-name:var(--font-safira)] text-3xl sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-sm">
              Practical answers on dx and px, session rules, and how xStream fits
              the wider idea: give users the reins to dividend yield.
            </p>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-card/40 px-6">
            {faqs.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* CTA Banner                                                        */}
      {/* ----------------------------------------------------------------- */}
      <Section className="relative overflow-hidden bg-grid">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#ffffff_70%)]" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-32 text-center sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-safira)] text-4xl sm:text-5xl">
            Route yield and price{" "}
            <span className="text-primary glow-lime-text">your way</span>
          </h2>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Explore the vault, markets, and docs. The same derivative logic that
            powers TradFi dividend markets is now composable on-chain -- live
            on Ink Sepolia and Ethereum Sepolia.
          </p>
          <div className="mt-10">
            <Link
              href="/app"
              className={buttonVariants({ size: "lg", className: "bg-primary text-primary-foreground hover:bg-primary/80 font-semibold px-8" })}
            >
              Open app
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}
