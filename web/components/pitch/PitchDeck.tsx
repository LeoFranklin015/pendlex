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
import { APP_NAME, APP_NAME_FULL } from "@/lib/constants";
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
    title: "Trade dividend yield on-chain",
    centerTitle: true,
    visual: <AnimSplitTokens />,
    body: (
      <>
        <p className="mt-6 max-w-xl text-center text-base text-muted-foreground">
          <span className="font-mono text-foreground">{APP_NAME_FULL}</span> is a
          permissionless
          dividend yield-trading protocol. Wrap LSTs, LRTs, stablecoins, RWAs, and
          tokenized stocks into{" "}
          <span className="font-mono text-accent">SY</span>, split into{" "}
          <span className="font-mono text-accent">YT</span> (yield) and{" "}
          <span className="font-mono text-foreground">PT</span> (principal), and trade both
          on the xStream AMM. First app focus: xStocks on{" "}
          <span className="font-mono text-muted-foreground">Base</span> with{" "}
          <span className="font-mono text-muted-foreground">Pyth</span> marks.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {[
            "xStocks",
            "LSTs / LRTs",
            "RWAs",
            "permissionless",
            "AMM",
            "Base",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-xs text-muted-foreground"
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
          <ChevronDown className="size-6 text-muted-foreground/60" />
        </motion.div>
      </>
    ),
  },
  {
    id: "exec",
    section: "01 — Executive summary",
    title: "SY, split, then AMM",
    contentAlign: "start",
    visual: (
      <motion.div
        className="grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-20%" }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {[
          { k: "SY", sub: "Standardized yield wrapper", a: true },
          { k: "YT", sub: "Dividend / payout leg", a: true },
          { k: "PT", sub: "Principal leg", a: false },
          { k: "AMM", sub: "Trade PT and YT", a: true },
        ].map((c) => (
          <motion.div
            key={c.k}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0 },
            }}
            className={`rounded-2xl border p-5 ${
              c.a
                ? "border-accent/25 bg-accent/5"
                : "border-border bg-card"
            }`}
          >
            <p className="font-mono text-lg text-accent">{c.k}</p>
            <p className="mt-2 text-sm text-muted-foreground">{c.sub}</p>
          </motion.div>
        ))}
      </motion.div>
    ),
    body: (
      <ul className="mt-8 max-w-xl space-y-2 text-left text-sm text-muted-foreground">
        <li>
          Second-order layer on existing yield primitives: liquid staking, restaking,
          stablecoins, RWAs, xStocks, and more.
        </li>
        <li>
          Anyone can create a market on-chain; the official UI curates visibility.
          Community Listing Portal streamlines safer listings.
        </li>
        <li>
          TradFi interest-derivative markets are huge in notional terms; xStream brings
          that expressiveness to DeFi for dividend-style cash flows.
        </li>
      </ul>
    ),
  },
  {
    id: "problem",
    section: "02 — Problem",
    title: "You cannot size dividend yield",
    contentAlign: "start",
    visual: <AnimProblemBars />,
    body: (
      <ul className="mt-8 max-w-xl space-y-3 text-left text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="text-red-400/90">-</span>
          <span>
            Payouts on tokenized stocks and yield-bearing assets move with regime:
            up in bulls, down in bears, plus issuer- and macro noise.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-red-400/90">-</span>
          <span>
            A single receipt token bundles price risk and dividend risk, so holders
            cannot dial exposure up or down without selling the whole position.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-accent">+</span>
          <span>
            xStream separates upcoming dividends into YT and principal into PT so users
            can hedge payout downturns, lean into rising dividends, or strip and trade
            each leg.
          </span>
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
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            In scope
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              Dividend-tokenization: wrap to SY, mint PT and YT, recombine to exit.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              xStream AMM for PT and YT; users trade without mastering pool math.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              xStock rail on Base with Pyth pull oracles; registry expands to more names.
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Out of scope
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground/90">
            <li className="flex gap-2">
              <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
              Custody-first product, every asset class on day one, protocol governance
              token.
            </li>
            <li className="flex gap-2">
              <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
              Fiat on-ramps, omnichain routing, and traditional brokerage UX.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "personas",
    section: "04 — Users",
    title: "Strategies the protocol unlocks",
    body: (
      <div className="mt-6 grid max-w-4xl gap-3 sm:grid-cols-2">
        {[
          {
            n: "Fixed payout",
            r: "Yield shape",
            d: "Shape dividend exposure on xStocks and similar yield-bearing tokens.",
          },
          {
            n: "Long dividends",
            r: "Bullish payouts",
            d: "Buy YT when you expect distributions to rise; express a pure payout view.",
          },
          {
            n: "Strip and hold",
            r: "Carry",
            d: "Sell PT, keep YT to earn payout stream without funding the full basket.",
          },
          {
            n: "Liquidity + arb",
            r: "LP / basis",
            d: "Provide AMM liquidity on PT and YT; trade basis vs the underlying SY.",
          },
        ].map((p, i) => (
          <motion.div
            key={p.n}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 * i }}
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/40"
          >
            <p className="font-mono text-xs text-accent">
              {p.n}
              <span className="text-muted-foreground"> — {p.r}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    id: "architecture",
    section: "05 — Architecture",
    title: "On-chain stack (Base)",
    visual: <AnimArchitectureFlow />,
    body: (
      <p className="mt-6 max-w-2xl text-left text-sm text-muted-foreground">
        Users interact with SY mint/split, the xStream AMM, and listing flows. Price
        marks for equity rails use Pyth pull; session and settlement modules align
        risk with when cash equity trades. Same pattern extends to other SY underliers
        as markets go live.
      </p>
    ),
  },
  {
    id: "protocol",
    section: "06 — Core protocol",
    title: "Tokenization, AMM, oracle",
    contentAlign: "start",
    splitBodyVisual: true,
    visual: (
      <div className="flex w-full max-w-md flex-col items-center gap-6 lg:max-w-none lg:items-end">
        <AnimAccumulatorPulse />
        <div className="flex w-full flex-wrap justify-center gap-2 lg:max-w-md lg:justify-end">
          {[
            "SY wrapper",
            "PT / YT",
            "xStream AMM",
            "Pyth adapter",
            "Session keeper",
          ].map((name) => (
            <span
              key={name}
              className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-[10px] text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    ),
    body: (
      <ul className="max-w-xl space-y-2 text-left text-sm text-muted-foreground">
        <li>
          Dividend accrual routes to YT holders; PT represents the ex-yield principal
          leg. Recombining PT + YT restores SY and keeps basis tight versus the
          underlier.
        </li>
        <li>
          App implementation maps protocol YT/PT to income and price rails (e.g.{" "}
          <span className="font-mono text-foreground">xdSPY</span> /{" "}
          <span className="font-mono text-foreground">xpSPY</span>) for SPY xStock.
        </li>
        <li>
          Oracle updates are pull-based; stale or invalid Pyth VAAs revert sensitive
          operations.
        </li>
      </ul>
    ),
  },
  {
    id: "economics",
    section: "07 — Token economics",
    title: "Fees and YT carry",
    contentAlign: "start",
    splitBodyVisual: true,
    visual: <AnimApyMeter target={14} className="items-end" />,
    body: (
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border font-mono text-xs text-muted-foreground">
                <th className="p-3">Fee</th>
                <th className="p-3">Rate</th>
                <th className="p-3">To</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <td className="p-3">Open (example)</td>
                <td className="p-3 font-mono text-accent">0.05%</td>
                <td className="p-3">USDC LP</td>
              </tr>
              <tr>
                <td className="p-3">Short reserve (example)</td>
                <td className="p-3">0.025%</td>
                <td className="p-3">price-leg reserve</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-mono text-xs text-muted-foreground/80">
          Illustrative xStock rail: ~1.3% dividend yield plus trading and session fees
          can compound into a wide YT holder range (e.g. low teens % in some models).
          Not a promise of returns.
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
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-mono text-accent">Phase 1</span> SY standard,
            dividend-tokenization, and audited accrual logic for the first underliers.
          </li>
          <li>
            <span className="font-mono text-accent">Phase 2</span> xStream AMM live,
            multi-name xStock support (e.g. AAPL, ABT, SPY), testnet keeper and
            listings.
          </li>
          <li>
            <span className="font-mono text-accent">Phase 3</span> External audit
            remediation, mainnet launch, Community Listing Portal and curated app
            catalog.
          </li>
        </ul>
        <p className="mt-8 font-mono text-xs text-muted-foreground/80">
          Success: TVL in SY, AMM volume, keeper uptime, predictable YT claims, and
          orderly PT/YT basis versus underliers.
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
    <div className="fixed inset-0 z-[100] bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(77,122,0,0.10),transparent_55%)]" />

      {/* Top bar */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-[110] flex items-center justify-between px-4 py-4 sm:px-6">
        <LogoWordmark
          href="/"
          iconSize={28}
          imageClassName="opacity-90"
          textClassName="text-base"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          suffix={
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
              pitch
            </span>
          }
        />
        <span className="hidden font-mono text-[10px] text-muted-foreground/80 sm:block">
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
      <div className="pointer-events-none absolute bottom-4 right-4 z-[110] font-mono text-xs text-muted-foreground sm:bottom-6 sm:right-6">
        {String(current + 1).padStart(2, "0")} /{" "}
        {String(slides.length).padStart(2, "0")}
      </div>

      {/* Arrows */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[110] flex -translate-x-1/2 gap-3 sm:bottom-8">
        <button
          type="button"
          onClick={goPrev}
          disabled={current === 0}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={current === slides.length - 1}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
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
                  className={`font-[family-name:var(--font-safira)] text-4xl text-foreground md:text-5xl lg:text-6xl ${
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
