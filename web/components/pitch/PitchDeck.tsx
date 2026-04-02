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
  AlertTriangle,
} from "lucide-react";
import {
  AnimSplitTokens,
  AnimProblemBars,
  AnimArchitectureFlow,
  AnimApyMeter,
  AnimAccumulatorPulse,
  AnimPhaseDots,
  AnimMoatGrid,
  AnimMarketSize,
  AnimFlywheel,
  AnimSolutionSteps,
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
  /* ── 1. Hook ── */
  {
    id: "hook",
    section: APP_NAME,
    title: "You can trade a stock on-chain. You can't trade its dividend.",
    centerTitle: true,
    visual: <AnimSplitTokens />,
    body: (
      <>
        <p className="mt-6 max-w-xl text-center text-base text-muted-foreground">
          Every xStock pays dividends -- quarterly, variable, regime-dependent.
          But today there is no way to sell that yield, hedge it, lever it, or
          price what next quarter's payout is worth. The yield is trapped inside
          the token.
        </p>
        <p className="mt-4 max-w-lg text-center font-mono text-sm text-accent">
          {APP_NAME_FULL} sets it free.
        </p>
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

  /* ── 2. Problem ── */
  {
    id: "problem",
    section: "01 -- The problem",
    title: "Equity yield is the largest untouched primitive in DeFi",
    contentAlign: "start",
    visual: <AnimProblemBars />,
    body: (
      <ul className="mt-8 max-w-xl space-y-3 text-left text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="text-red-400/90">-</span>
          <span>
            xStock dividends are <strong className="text-foreground">discrete</strong>{" "}
            (quarterly), <strong className="text-foreground">variable</strong>{" "}
            (board-set), and <strong className="text-foreground">regime-dependent</strong>{" "}
            (cut in bears, raised in bulls).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-red-400/90">-</span>
          <span>
            A single token bundles price risk and dividend risk. Holders cannot
            isolate one without selling the other entirely.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-red-400/90">-</span>
          <span>
            No on-chain yield curve for equity dividends. No fixed income. No
            forward market. No way to express a view on payouts alone.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-accent">+</span>
          <span>
            In TradFi, interest-rate derivatives exist precisely to separate yield
            from principal. That market is $500T+ in notional. For tokenized
            equities on-chain, it is zero.
          </span>
        </li>
      </ul>
    ),
  },

  /* ── 3. Solution (one sentence) ── */
  {
    id: "solution",
    section: "02 -- The solution",
    title: "Deposit. Split. Trade.",
    centerTitle: true,
    visual: <AnimSolutionSteps />,
    body: (
      <>
        <p className="mt-8 max-w-2xl text-center text-base text-muted-foreground">
          xStream splits any xStock into a{" "}
          <span className="font-mono text-accent">dx</span> (dividend token --
          receives 100% of yield, tradeable 24/7) and a{" "}
          <span className="font-mono text-foreground">px</span> (price token --
          pure price exposure, leveraged, session-gated) -- then lets you trade,
          hedge, or recombine each leg independently.
        </p>
        <div className="mt-8 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { k: "xStock", sub: "Tokenized equity" },
            { k: "dx", sub: "Dividend / yield leg" },
            { k: "px", sub: "Price / principal leg" },
            { k: "Recombine", sub: "Burn both, get xStock" },
          ].map((c) => (
            <motion.div
              key={c.k}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-accent/25 bg-accent/5 p-4 text-center"
            >
              <p className="font-mono text-lg text-accent">{c.k}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
            </motion.div>
          ))}
        </div>
      </>
    ),
  },

  /* ── 4. xStocks depth (targets 30% Relevance score) ── */
  {
    id: "xstocks",
    section: "03 -- Why xStocks are the foundation",
    title: "Built on xStocks. Not bolted on.",
    contentAlign: "start",
    body: (
      <div className="mt-6 w-full max-w-3xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              tag: "Rebase detection",
              detail:
                "Vault reads xStock.multiplier() every sync to detect dividend events. The entire accumulator is driven by this xStock-native signal.",
            },
            {
              tag: "6 live assets",
              detail:
                "AAPL, NVDA, TSLA, SPY, GOOGL, GLD -- each registered with real Pyth price feeds on Sepolia testnet today.",
            },
            {
              tag: "Demand flywheel",
              detail:
                "Every vault deposit locks xStocks on-chain. Splitting creates NEW demand from users who would never hold a plain xStock.",
            },
            {
              tag: "Recombination anchor",
              detail:
                "Burn dx + px = redeem xStock. This creates hard arbitrage bounds that keep the combined price pegged to the underlier -- no oracle needed.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.tag}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 * i }}
              className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5"
            >
              <p className="font-mono text-xs text-accent">{item.tag}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          xStocks are not one of many supported assets -- they are{" "}
          <strong className="text-foreground">the asset class the protocol exists to serve</strong>.
          Every contract, every oracle call, every session gate is designed around
          how tokenized equities and their dividends actually work.
        </p>
      </div>
    ),
  },

  /* ── 5. What's unique ── */
  {
    id: "unique",
    section: "04 -- What makes this different",
    title: "Four things nobody else does",
    contentAlign: "start",
    visual: <AnimMoatGrid />,
    body: (
      <p className="mt-6 max-w-2xl text-left text-sm text-muted-foreground">
        Yield tokenization exists for LSTs and stablecoins, but nobody has
        applied it to tokenized equities. xStream is purpose-built for the
        mechanics of equity dividends: discrete rebases, session-gated trading,
        and an auction layer for forward yield pricing.
      </p>
    ),
  },

  /* ── 6. Architecture ── */
  {
    id: "architecture",
    section: "05 -- How it works",
    title: "7 contracts. Real feeds. Live testnet.",
    contentAlign: "start",
    splitBodyVisual: true,
    visual: (
      <div className="flex w-full max-w-md flex-col items-center gap-6 lg:max-w-none lg:items-end">
        <AnimArchitectureFlow />
        <div className="flex w-full flex-wrap justify-center gap-2 lg:max-w-md lg:justify-end">
          {[
            "XStreamVault",
            "XStreamExchange",
            "DxLeaseEscrow",
            "PythAdapter",
            "MarketKeeper",
            "dx / px / LP tokens",
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
      <ul className="max-w-xl space-y-3 text-left text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">Vault:</strong> Deposit xStock,
          mint 1:1 dx + px. Masterchef accumulator (1e36 precision) routes 100%
          of rebase yield to dx holders at O(1) gas.
        </li>
        <li>
          <strong className="text-foreground">Exchange:</strong> Leveraged
          long/short on px with USDC collateral. Session-gated to NYSE hours.
          Keeper force-settles all positions at close.
        </li>
        <li>
          <strong className="text-foreground">Oracle:</strong> Pyth pull model,
          prices normalized to 1e18, 60s staleness enforcement. Real feeds for
          AAPL, NVDA, TSLA, SPY, GOOGL, GLD.
        </li>
        <li>
          <strong className="text-foreground">Auction:</strong> dx holders lease
          dividend rights for 1-4 quarters via competitive bidding -- a forward
          yield market.
        </li>
      </ul>
    ),
  },

  /* ── 7. Auction (bloated CTA) ── */
  {
    id: "auction",
    section: "06 -- Forward yield market",
    title: "Rent yield. Bid for income.",
    contentAlign: "start",
    splitBodyVisual: true,
    visual: (
      <div className="w-full max-w-md space-y-3">
        <motion.div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">
                xd
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">xdSPY</p>
                <p className="text-[10px] text-muted-foreground">
                  500 tokens / 2Q lease
                </p>
              </div>
            </div>
            <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">
              14.2% APY
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Highest Bid
              </p>
              <p className="mt-1 text-xl font-bold text-accent">$2,450</p>
              <p className="text-[9px] text-muted-foreground">USDC</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Floor Price
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">$1,800</p>
              <p className="text-[9px] text-muted-foreground">USDC</p>
            </div>
          </div>
          <div className="space-y-3 px-5 pb-5">
            <div className="flex gap-2">
              <div className="flex h-12 flex-1 items-center rounded-xl border border-border/50 bg-muted/30 px-4 font-mono text-lg text-muted-foreground/40">
                2,500
              </div>
              <motion.button
                className="flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Bid
              </motion.button>
            </div>
            <motion.button
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-foreground text-base font-bold text-background shadow-xl shadow-foreground/10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              List Your Tokens
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          {["6h 42m left", "12 bids", "+xPoints"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </motion.div>
      </div>
    ),
    body: (
      <ul className="max-w-xl space-y-3 text-left text-sm text-muted-foreground">
        <li>
          dx holders <strong className="text-foreground">auction</strong> their
          dividend stream for a fixed lease (1-4 quarters). Bidders compete in
          USDC.
        </li>
        <li>
          Highest bidder receives all dividends during the lease. After expiry,
          dx returns to the seller automatically.
        </li>
        <li>
          This is a{" "}
          <strong className="text-foreground">forward yield market</strong> --
          price discovery on what future dividends are worth, not just spot yield.
        </li>
        <li>
          Nothing like this exists for tokenized equities today.
        </li>
      </ul>
    ),
  },

  /* ── 8. Viability + Impact ── */
  {
    id: "viability",
    section: "07 -- Viability and impact",
    title: "Who uses this, and why it matters for xStocks",
    centerTitle: true,
    visual: <AnimFlywheel />,
    body: (
      <div className="mt-6 w-full max-w-3xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              n: "Income investors",
              d: "Buy dx for yield without price volatility. Claim dividends. Reinvest.",
            },
            {
              n: "Day traders",
              d: "Leveraged price exposure via px. No dividend drag. USDC-settled. Session-gated.",
            },
            {
              n: "Yield strippers",
              d: "Split xStock, sell px for USDC, hold dx at below-face cost basis.",
            },
            {
              n: "Arbitrageurs",
              d: "Recombine when dx + px < xStock, split when >. Keep system price-efficient.",
            },
          ].map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 * i }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <p className="font-mono text-xs text-accent">{p.n}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{p.d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/[0.04] p-5">
          <p className="font-mono text-xs text-accent">Impact for xStocks</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              Every vault deposit <strong className="text-foreground">locks xStocks on-chain</strong>,
              increasing demand beyond buy-and-hold.
            </li>
            <li>
              dx and px are standard ERC-20s -- listable on any DEX, composable
              with lending, yield aggregators, and other protocols.
            </li>
            <li>
              Trading fees flow to LPs and dx holders, creating a self-reinforcing
              flywheel of deposits, liquidity, and volume.
            </li>
          </ul>
        </div>
      </div>
    ),
  },

  /* ── 9. Trade-offs + Roadmap ── */
  {
    id: "roadmap",
    section: "08 -- Roadmap and trade-offs",
    title: "What we built, what we know, what is next",
    visual: <AnimPhaseDots active={4} />,
    body: (
      <div className="mt-8 w-full max-w-3xl text-left">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Progress */}
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
              Progress
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-mono text-accent">Phase 0-3</span>{" "}
                Vault + Exchange + 6 xStock assets
                <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                  done
                </span>
              </li>
              <li>
                <span className="font-mono text-accent">Phase 4</span>{" "}
                Testnet on Sepolia. Keeper running. Frontend live.
                <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                  live
                </span>
              </li>
              <li>
                <span className="font-mono text-foreground">Phase 5</span>{" "}
                Third-party audit
              </li>
              <li>
                <span className="font-mono text-foreground">Phase 6</span>{" "}
                Mainnet on Base. Seed liquidity.
              </li>
            </ul>
          </div>

          {/* Trade-offs */}
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Honest trade-offs
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-yellow-500/70" />
                <span>
                  Keeper is centralized in v1. Chainlink Automation planned for v1.2.
                </span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-yellow-500/70" />
                <span>
                  500-position cap per pool to bound settlement gas.
                </span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-yellow-500/70" />
                <span>
                  Oracle dependency: Pyth feed unavailability halts trading (emergency close exists).
                </span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-yellow-500/70" />
                <span>
                  LP pool insolvency risk if many traders profit simultaneously. Fee income builds reserves over time.
                </span>
              </li>
            </ul>
          </div>
        </div>
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
