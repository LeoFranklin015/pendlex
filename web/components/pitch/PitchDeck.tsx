"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import {
  AnimSplitTokens,
  AnimProblemBars,
  AnimArchitectureFlow,
  AnimApyMeter,
  AnimAccumulatorPulse,
  AnimPhaseDots,
} from "./pitch-visuals";
import { APP_NAME } from "@/lib/constants";
import { LogoWordmark } from "@/components/LogoWordmark";

type SlideDef = {
  id: string;
  section: string;
  title: string;
  visual?: ReactNode;
  body: ReactNode;
  centerTitle?: boolean;
  /** When start, slide content aligns to the left (second slide, etc.) */
  contentAlign?: "center" | "start";
  /** Text body left, visual right (lg grid); stacks body-first on small screens */
  splitBodyVisual?: boolean;
};

const slides: SlideDef[] = [
  {
    id: "title",
    section: APP_NAME,
    title: "Split yield from price",
    centerTitle: true,
    visual: <AnimSplitTokens />,
    body: (
      <>
        <p className="mt-6 max-w-xl text-center text-base text-white/55">
          DeFi protocol for tokenized equity ETFs (xStocks): mint{" "}
          <span className="font-mono text-accent">dx</span> (dividend rights) and{" "}
          <span className="font-mono text-white/80">px</span> (price only) on{" "}
          <span className="font-mono text-white/60">Base</span>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["AAPL", "ABT", "SPY", "Pyth", "NYSE sessions"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/50"
            >
              {t}
            </span>
          ))}
        </div>
        <motion.div
          className="mt-14 flex justify-center"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <ChevronDown className="size-6 text-white/30" />
        </motion.div>
      </>
    ),
  },
  {
    id: "exec",
    section: "01 — Executive summary",
    title: "Two markets, one vault",
    contentAlign: "start",
    visual: (
      <motion.div
        className="grid w-full max-w-2xl grid-cols-2 gap-4 md:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-20%" }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {[
          { k: "dx", sub: "24/7 income market", a: true },
          { k: "px", sub: "NYSE-hours leverage", a: false },
          { k: "Vault", sub: "split and recombine", a: true },
        ].map((c) => (
          <motion.div
            key={c.k}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0 },
            }}
            className={`rounded-2xl border p-6 ${
              c.a
                ? "border-accent/25 bg-accent/[0.05]"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <p className="font-mono text-lg text-accent">{c.k}</p>
            <p className="mt-2 text-sm text-white/50">{c.sub}</p>
          </motion.div>
        ))}
      </motion.div>
    ),
    body: (
      <ul className="mt-8 max-w-xl space-y-2 text-left text-sm text-white/55">
        <li>Targets AAPL, ABT, SPY xStocks at launch; registry adds assets.</li>
        <li>Pyth Network for px pricing; dividend rebases flow 100% to dx.</li>
        <li>Recombine dx + px to restore xStock; keeps arbitrage bounds tight.</li>
      </ul>
    ),
  },
  {
    id: "problem",
    section: "02 — Problem",
    title: "One token, two audiences",
    contentAlign: "start",
    visual: <AnimProblemBars />,
    body: (
      <ul className="mt-8 max-w-xl space-y-3 text-left text-sm text-white/55">
        <li className="flex gap-2">
          <span className="text-red-400/90">-</span>
          <span>Income investors absorb equity vol they do not want.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-red-400/90">-</span>
          <span>Day traders pay implied dividend drag on intraday px.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-accent">+</span>
          <span>No DeFi protocol splits xStocks into tradeable yield vs price.</span>
        </li>
      </ul>
    ),
  },
  {
    id: "goals",
    section: "03 — Goals",
    title: "What we ship in v1",
    body: (
      <div className="mt-4 grid max-w-3xl gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            In scope
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/55">
            <li className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              Vault split, O(1) dividend claims, recombination.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              dx secondary liquidity; px exchange with session rules.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              Single chain: Base. Sole oracle: Pyth pull model.
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-white/40">
            Out of scope
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/45">
            <li className="flex gap-2">
              <X className="mt-0.5 size-4 shrink-0 text-white/35" />
              Custodial UI, non-xStock assets, governance token.
            </li>
            <li className="flex gap-2">
              <X className="mt-0.5 size-4 shrink-0 text-white/35" />
              Fiat ramps, cross-chain, perpetuals (daily settle only).
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "personas",
    section: "04 — Users",
    title: "Four core journeys",
    body: (
      <div className="mt-6 grid max-w-4xl gap-3 sm:grid-cols-2">
        {[
          {
            n: "Alice",
            r: "Income",
            d: "Hold dx for yield; minimal price risk.",
          },
          {
            n: "Bob",
            r: "Trader",
            d: "Long or short px in session; USDC collateral.",
          },
          {
            n: "Carol",
            r: "Stripper",
            d: "Split, sell px, keep cheap dx yield.",
          },
          {
            n: "Dave",
            r: "Arb",
            d: "Lock in dx + px vs xStock mispricing.",
          },
        ].map((p, i) => (
          <motion.div
            key={p.n}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 * i }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-accent/30"
          >
            <p className="font-mono text-xs text-accent">
              {p.n} — {p.r}
            </p>
            <p className="mt-2 text-sm text-white/55">{p.d}</p>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    id: "architecture",
    section: "05 — Architecture",
    title: "Contracts on Base",
    visual: <AnimArchitectureFlow />,
    body: (
      <p className="mt-6 max-w-2xl text-left text-sm text-white/55">
        Vault mints px and dx; exchange settles USDC margined positions; PythAdapter
        normalizes prices; MarketKeeper opens and closes NYSE-aligned sessions and
        triggers settlement batches.
      </p>
    ),
  },
  {
    id: "protocol",
    section: "06 — Core protocol",
    title: "Vault, markets, oracle",
    contentAlign: "start",
    splitBodyVisual: true,
    visual: (
      <div className="flex w-full max-w-md flex-col items-center gap-6 lg:max-w-none lg:items-end">
        <AnimAccumulatorPulse />
        <div className="flex w-full flex-wrap justify-center gap-2 lg:max-w-md lg:justify-end">
          {["XStreamVault", "DividendToken", "PrincipalToken", "XStreamExchange", "MarketKeeper"].map(
            (name) => (
              <span
                key={name}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] text-white/45"
              >
                {name}
              </span>
            )
          )}
        </div>
      </div>
    ),
    body: (
      <ul className="max-w-xl space-y-2 text-left text-sm text-white/55">
        <li>100% of dividend delta to dx via Masterchef-style accumulator.</li>
        <li>px: up to 5x leverage, session-gated opens, keeper settle at close.</li>
        <li>Stale Pyth prices revert; Hermes VAA supplied per tx.</li>
      </ul>
    ),
  },
  {
    id: "economics",
    section: "07 — Token economics",
    title: "Fees and dx yield",
    contentAlign: "start",
    splitBodyVisual: true,
    visual: <AnimApyMeter target={14} className="items-end" />,
    body: (
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 font-mono text-xs text-white/40">
                <th className="p-3">Fee</th>
                <th className="p-3">Rate</th>
                <th className="p-3">To</th>
              </tr>
            </thead>
            <tbody className="text-white/55">
              <tr className="border-b border-white/[0.06]">
                <td className="p-3">Open</td>
                <td className="p-3 font-mono text-accent">0.05%</td>
                <td className="p-3">USDC LP</td>
              </tr>
              <tr>
                <td className="p-3">Short reserve</td>
                <td className="p-3">0.025%</td>
                <td className="p-3">px reserve</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-mono text-xs text-white/35">
          SPY example: ~1.3% div + session fees yields ~12-16% est. dx APY (not
          guaranteed).
        </p>
      </div>
    ),
  },
  {
    id: "roadmap",
    section: "08 — Roadmap",
    title: "Phases to mainnet",
    visual: <AnimPhaseDots active={3} />,
    body: (
      <div className="mt-8 w-full max-w-2xl text-left">
        <ul className="space-y-3 text-sm text-white/55">
          <li>
            <span className="font-mono text-accent">W1-3</span> Foundation and vault
            with invariant-tested accumulator.
          </li>
          <li>
            <span className="font-mono text-accent">W4-6</span> Exchange, multi-asset
            (AAPL, ABT, SPY), testnet keeper.
          </li>
          <li>
            <span className="font-mono text-accent">W8-10</span> Audit remediation;
            <span className="font-mono text-white/50"> W11 </span>
            mainnet launch targets from PRD.
          </li>
        </ul>
        <p className="mt-8 font-mono text-xs text-white/35">
          Success: TVL, session volume, keeper uptime, clean dividend claims.
        </p>
      </div>
    ),
  },
];

export default function PitchDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [current, setCurrent] = useState(0);

  const scrollToSlide = useCallback((index: number) => {
    const el = slideRefs.current[index];
    if (!el || !containerRef.current) return;
    isScrolling.current = true;
    setCurrent(index);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      isScrolling.current = false;
    }, 600);
  }, []);

  const goNext = useCallback(() => {
    if (current < slides.length - 1) scrollToSlide(current + 1);
  }, [current, scrollToSlide]);

  const goPrev = useCallback(() => {
    if (current > 0) scrollToSlide(current - 1);
  }, [current, scrollToSlide]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target) return;
        const idx = slideRefs.current.findIndex((r) => r === visible.target);
        if (idx >= 0) setCurrent(idx);
      },
      { root, threshold: [0.35, 0.55, 0.75] }
    );

    slideRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });

    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(200,255,0,0.06),transparent_55%)]" />

      {/* Top bar */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-[110] flex items-center justify-between px-4 py-4 sm:px-6">
        <LogoWordmark
          href="/"
          iconSize={28}
          imageClassName="opacity-90"
          textClassName="text-base text-white/90 transition-colors group-hover:text-white"
          className="text-sm text-white/70 transition-colors hover:text-white"
          suffix={
            <span className="font-mono text-xs uppercase tracking-widest text-white/50 group-hover:text-white/80">
              pitch
            </span>
          }
        />
        <span className="hidden font-mono text-[10px] text-white/35 sm:block">
          arrows / space to navigate
        </span>
      </div>

      {/* Dots */}
      <div className="pointer-events-auto absolute right-4 top-1/2 z-[110] flex -translate-y-1/2 flex-col gap-2 sm:right-6">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToSlide(i)}
            className="group flex h-8 w-5 items-center justify-end py-1"
            aria-label={`Go to slide ${i + 1}`}
          >
            <motion.span
              layout
              className={`block rounded-full bg-accent transition-all ${
                i === current ? "h-3 w-3 opacity-100" : "h-2 w-2 opacity-35"
              }`}
              animate={{
                width: i === current ? 12 : 8,
                opacity: i === current ? 1 : 0.35,
              }}
            />
          </button>
        ))}
      </div>

      {/* Counter */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-[110] font-mono text-xs text-white/40 sm:bottom-6 sm:right-6">
        {String(current + 1).padStart(2, "0")} /{" "}
        {String(slides.length).padStart(2, "0")}
      </div>

      {/* Arrows */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[110] flex -translate-x-1/2 gap-3 sm:bottom-8">
        <button
          type="button"
          onClick={goPrev}
          disabled={current === 0}
          className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 transition-colors hover:border-accent/40 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={current === slides.length - 1}
          className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 transition-colors hover:border-accent/40 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
          aria-label="Next slide"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Scroll area */}
      <div
        ref={containerRef}
        className="no-scrollbar h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className={`flex min-h-screen w-full snap-start snap-always flex-col justify-center px-6 py-24 sm:px-20 ${
              slide.contentAlign === "start" ? "items-start" : "items-center"
            }`}
          >
            <div className="w-full max-w-[1200px]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{
                  root: containerRef,
                  once: true,
                  amount: 0.4,
                }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className={
                  slide.centerTitle
                    ? "flex flex-col items-center text-center"
                    : slide.contentAlign === "start"
                      ? "flex w-full flex-col items-start text-left"
                      : ""
                }
              >
                <p className="font-mono text-sm tracking-widest text-accent">
                  {slide.section}
                </p>
                <h2
                  className={`font-[family-name:var(--font-safira)] text-4xl text-white md:text-5xl lg:text-6xl ${
                    slide.centerTitle ? "mt-4 max-w-3xl" : "mt-4 max-w-4xl text-left"
                  }`}
                >
                  {slide.title}
                </h2>
                {slide.splitBodyVisual && slide.visual ? (
                  <div className="mt-10 grid w-full gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
                    <div className="min-w-0">{slide.body}</div>
                    <div className="flex min-w-0 justify-center lg:justify-end">
                      {slide.visual}
                    </div>
                  </div>
                ) : (
                  <>
                    {slide.visual ? (
                      <div
                        className={
                          slide.centerTitle ? "mt-10 w-full" : "mt-10 w-full text-left"
                        }
                      >
                        {slide.visual}
                      </div>
                    ) : null}
                    <div
                      className={
                        slide.centerTitle
                          ? "mt-6 flex w-full flex-col items-center"
                          : "mt-6 w-full"
                      }
                    >
                      {slide.body}
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
