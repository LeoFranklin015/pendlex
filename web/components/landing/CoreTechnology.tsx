"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// ---------------------------------------------------------------------------
// Panel 1 -- Token Splitting
// ---------------------------------------------------------------------------

function TokenSplitSVG() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-60px" });

  const CYCLE = 2.0;
  const DELAY = 3.0;

  return (
    <div ref={ref} className="flex items-center justify-center h-52">
      <svg viewBox="0 0 260 180" className="w-full max-w-[260px]">
        <defs>
          <filter id="glow-ts">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="xstock-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4d7a00" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4d7a00" stopOpacity="0.03" />
          </radialGradient>
          <radialGradient id="dx-grad-v2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4d7a00" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#4d7a00" stopOpacity="0.03" />
          </radialGradient>
          <radialGradient id="px-grad-v2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.04" />
          </radialGradient>
        </defs>

        {/* Source token */}
        <motion.circle
          cx="130" cy="58" r="32"
          fill="url(#xstock-grad)" stroke="#4d7a00" strokeWidth="1.4"
          filter="url(#glow-ts)"
          animate={inView ? { opacity: [1, 1, 0.15], scale: [1, 1.06, 0.55] } : { opacity: 1, scale: 1 }}
          transition={{ duration: CYCLE, delay: 0.2, ease: "easeInOut", repeat: Infinity, repeatDelay: DELAY }}
        />
        <motion.text
          x="130" y="54" textAnchor="middle" dominantBaseline="middle"
          fill="#4d7a00" fontSize="8.5" fontWeight="700" fontFamily="monospace"
          animate={inView ? { opacity: [1, 1, 0] } : { opacity: 1 }}
          transition={{ duration: CYCLE, delay: 0.2, repeat: Infinity, repeatDelay: DELAY }}
        >
          xStock
        </motion.text>
        <motion.text
          x="130" y="67" textAnchor="middle" dominantBaseline="middle"
          fill="#4d7a00" fontSize="6.5" fontFamily="monospace"
          animate={inView ? { opacity: [0.55, 0.55, 0] } : { opacity: 0.55 }}
          transition={{ duration: CYCLE, delay: 0.2, repeat: Infinity, repeatDelay: DELAY }}
        >
          deposit
        </motion.text>

        {/* Vault label -- appears as bridge */}
        <motion.text
          x="130" y="102" textAnchor="middle" dominantBaseline="middle"
          fill="#71717a" fontSize="6" fontFamily="monospace" letterSpacing="0.08em"
          animate={inView ? { opacity: [0, 0.5, 0.5, 0] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.6, repeat: Infinity, repeatDelay: DELAY }}
        >
          VAULT
        </motion.text>

        {/* Split lines */}
        <motion.path
          d="M 112 92 L 80 126" stroke="#4d7a00" strokeWidth="1" strokeDasharray="4 3"
          fill="none"
          animate={inView ? { opacity: [0, 0.55, 0.55, 0], pathLength: [0, 1, 1, 1] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.75, repeat: Infinity, repeatDelay: DELAY }}
        />
        <motion.path
          d="M 148 92 L 180 126" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="4 3"
          fill="none"
          animate={inView ? { opacity: [0, 0.55, 0.55, 0], pathLength: [0, 1, 1, 1] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.75, repeat: Infinity, repeatDelay: DELAY }}
        />

        {/* dx token */}
        <motion.circle
          cx="70" cy="148" r="26"
          fill="url(#dx-grad-v2)" stroke="#4d7a00" strokeWidth="1.4"
          filter="url(#glow-ts)"
          animate={inView ? { opacity: [0, 0, 1], x: [18, 8, 0] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.85, ease: "easeOut", repeat: Infinity, repeatDelay: DELAY }}
        />
        <motion.text
          x="70" y="144" textAnchor="middle" dominantBaseline="middle"
          fill="#4d7a00" fontSize="8" fontWeight="700" fontFamily="monospace"
          animate={inView ? { opacity: [0, 0, 1] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.85, repeat: Infinity, repeatDelay: DELAY }}
        >
          dx
        </motion.text>
        <motion.text
          x="70" y="156" textAnchor="middle" dominantBaseline="middle"
          fill="#4d7a00" fontSize="6" fontFamily="monospace"
          animate={inView ? { opacity: [0, 0, 0.65] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.85, repeat: Infinity, repeatDelay: DELAY }}
        >
          income
        </motion.text>

        {/* px token */}
        <motion.circle
          cx="190" cy="148" r="26"
          fill="url(#px-grad-v2)" stroke="#7dd3fc" strokeWidth="1.4"
          filter="url(#glow-ts)"
          animate={inView ? { opacity: [0, 0, 1], x: [-18, -8, 0] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.85, ease: "easeOut", repeat: Infinity, repeatDelay: DELAY }}
        />
        <motion.text
          x="190" y="144" textAnchor="middle" dominantBaseline="middle"
          fill="#7dd3fc" fontSize="8" fontWeight="700" fontFamily="monospace"
          animate={inView ? { opacity: [0, 0, 1] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.85, repeat: Infinity, repeatDelay: DELAY }}
        >
          px
        </motion.text>
        <motion.text
          x="190" y="156" textAnchor="middle" dominantBaseline="middle"
          fill="#7dd3fc" fontSize="6" fontFamily="monospace"
          animate={inView ? { opacity: [0, 0, 0.65] } : { opacity: 0 }}
          transition={{ duration: CYCLE, delay: 0.85, repeat: Infinity, repeatDelay: DELAY }}
        >
          price
        </motion.text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel 2 -- Dividend Yield Engine (animated area chart)
// ---------------------------------------------------------------------------

function YieldCurveSVG() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-60px" });

  // Chart points for an upward-curving yield line
  const W = 220;
  const H = 130;
  const pad = { l: 28, r: 12, t: 14, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  // Yield data: y values 0-1 (0 = min APY ~1%, 1 = max APY ~18%)
  const rawPoints = [
    [0, 0.06], [0.08, 0.07], [0.16, 0.09], [0.24, 0.12],
    [0.32, 0.15], [0.40, 0.19], [0.48, 0.23], [0.56, 0.30],
    [0.64, 0.40], [0.72, 0.54], [0.80, 0.68], [0.88, 0.82],
    [0.96, 0.92], [1.0, 1.0],
  ];

  const pts = rawPoints.map(([x, y]) => [
    pad.l + x * iw,
    pad.t + ih - y * ih,
  ]);

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${(pad.t + ih).toFixed(1)} L ${pad.l} ${(pad.t + ih).toFixed(1)} Z`;

  // Y-axis labels
  const yLabels = [
    { y: 1.0, label: "18%" },
    { y: 0.6, label: "12%" },
    { y: 0.2, label: "5%" },
  ];

  return (
    <div ref={ref} className="flex items-center justify-center h-52">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[260px]">
        <defs>
          <linearGradient id="yield-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4d7a00" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#4d7a00" stopOpacity="0.01" />
          </linearGradient>
          <filter id="glow-yc">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="chart-clip">
            <motion.rect
              x={pad.l} y={pad.t}
              height={ih}
              animate={inView ? { width: [0, iw] } : { width: 0 }}
              transition={{ duration: 2, delay: 0.4, ease: "easeOut", repeat: Infinity, repeatDelay: 2 }}
            />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {[0.2, 0.6, 1.0].map((frac) => {
          const cy = pad.t + ih - frac * ih;
          return (
            <line
              key={frac}
              x1={pad.l} y1={cy} x2={pad.l + iw} y2={cy}
              stroke="#a1a1aa" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 4"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#yield-fill)" clipPath="url(#chart-clip)" />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#4d7a00"
          strokeWidth="1.8"
          filter="url(#glow-yc)"
          strokeDasharray="300"
          animate={inView ? { strokeDashoffset: [300, 0] } : { strokeDashoffset: 300 }}
          transition={{ duration: 2, delay: 0.4, ease: "easeOut", repeat: Infinity, repeatDelay: 2 }}
        />

        {/* Dot at end */}
        <motion.circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r="3.5"
          fill="#4d7a00"
          filter="url(#glow-yc)"
          animate={inView ? { opacity: [0, 0, 1], scale: [0.5, 0.5, 1] } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 2.2, repeat: Infinity, repeatDelay: 2.2 }}
        />

        {/* Tooltip at end */}
        <motion.g
          animate={inView ? { opacity: [0, 0, 1] } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 2.2, repeat: Infinity, repeatDelay: 2.2 }}
        >
          <rect
            x={pts[pts.length - 1][0] - 22}
            y={pts[pts.length - 1][1] - 22}
            width="44" height="16" rx="4"
            fill="#f4f4f5" stroke="#4d7a00" strokeWidth="0.8" strokeOpacity="0.45"
          />
          <text
            x={pts[pts.length - 1][0]}
            y={pts[pts.length - 1][1] - 10}
            textAnchor="middle"
            fill="#3f6600"
            fontSize="7"
            fontWeight="700"
            fontFamily="monospace"
          >
            18.4% APY
          </text>
        </motion.g>

        {/* Y-axis */}
        {yLabels.map(({ y, label }) => (
          <text
            key={label}
            x={pad.l - 4}
            y={pad.t + ih - y * ih + 3}
            textAnchor="end"
            fill="#52525b"
            fillOpacity="0.85"
            fontSize="6.5"
            fontFamily="monospace"
          >
            {label}
          </text>
        ))}

        {/* X-axis baseline */}
        <line
          x1={pad.l} y1={pad.t + ih}
          x2={pad.l + iw} y2={pad.t + ih}
          stroke="#a1a1aa" strokeOpacity="0.45" strokeWidth="1"
        />

        {/* dx yield label on area */}
        <motion.text
          x={pad.l + iw * 0.3}
          y={pad.t + ih * 0.55}
          textAnchor="middle"
          fill="#4d7a00"
          fillOpacity="0.35"
          fontSize="6"
          fontFamily="monospace"
          animate={inView ? { opacity: [0, 0, 0.5] } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 1.4, repeat: Infinity, repeatDelay: 2.8 }}
        >
          dx yield
        </motion.text>

        {/* X-axis label */}
        <text
          x={pad.l + iw / 2}
          y={H - 4}
          textAnchor="middle"
          fill="#71717a"
          fillOpacity="0.9"
          fontSize="6"
          fontFamily="monospace"
        >
          time
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel 3 -- Session Settlement (pie + lock)
// ---------------------------------------------------------------------------

function SessionSVG() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-60px" });

  const cx = 130;
  const cy = 95;
  const r = 48;
  const strokeW = 16;

  // 80% primary, 20% dark
  const circ = 2 * Math.PI * r;
  const lime80 = circ * 0.8;
  const gray20 = circ * 0.2;

  return (
    <div ref={ref} className="flex items-center justify-center h-52">
      <svg viewBox="0 0 260 180" className="w-full max-w-[260px]">
        <defs>
          <filter id="glow-ss">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background ring track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#d4d4d8"
          strokeOpacity="0.9"
          strokeWidth={strokeW}
        />

        {/* 20% gray slice (drawn first, behind) */}
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeW}
          strokeDasharray={`${gray20} ${circ - gray20}`}
          strokeDashoffset={-lime80}
          strokeLinecap="butt"
          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          animate={inView
            ? { strokeDasharray: [`0 ${circ}`, `${gray20} ${circ - gray20}`] }
            : { strokeDasharray: `0 ${circ}` }}
          transition={{ duration: 1.2, delay: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 2 }}
        />

        {/* 80% primary slice */}
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#4d7a00"
          strokeWidth={strokeW}
          strokeDasharray={`${lime80} ${circ - lime80}`}
          strokeLinecap="butt"
          filter="url(#glow-ss)"
          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          animate={inView
            ? { strokeDasharray: [`0 ${circ}`, `${lime80} ${circ - lime80}`] }
            : { strokeDasharray: `0 ${circ}` }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeOut", repeat: Infinity, repeatDelay: 2 }}
        />

        {/* Center label */}
        <motion.g
          animate={inView ? { opacity: [0, 1] } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2, repeat: Infinity, repeatDelay: 2.7 }}
        >
          <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
            fill="#71717a" fontSize="7" fontFamily="monospace" fontWeight="600">
            fees
          </text>
          <text x={cx} y={cy + 7} textAnchor="middle" dominantBaseline="middle"
            fill="#71717a" fontSize="5.5" fontFamily="monospace" opacity="0.6">
            distributed
          </text>
        </motion.g>

        {/* Labels */}
        <motion.g
          animate={inView ? { opacity: [0, 0, 1] } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.6, repeat: Infinity, repeatDelay: 1.8 }}
        >
          {/* 80% label -- left */}
          <circle cx="36" cy="52" r="5" fill="#4d7a00" opacity="0.12" />
          <text x="36" y="52" textAnchor="middle" dominantBaseline="middle"
            fill="#4d7a00" fontSize="6" fontWeight="700" fontFamily="monospace">
            80%
          </text>
          <text x="36" y="63" textAnchor="middle"
            fill="#4d7a00" fontSize="5.5" fontFamily="sans-serif" opacity="0.7">
            dx holders
          </text>

          {/* 20% label -- right */}
          <circle cx="224" cy="52" r="5" fill="#334155" opacity="0.4" />
          <text x="224" y="52" textAnchor="middle" dominantBaseline="middle"
            fill="#94a3b8" fontSize="6" fontWeight="700" fontFamily="monospace">
            20%
          </text>
          <text x="224" y="63" textAnchor="middle"
            fill="#94a3b8" fontSize="5.5" fontFamily="sans-serif" opacity="0.7">
            treasury
          </text>
        </motion.g>

        {/* Fee source label at bottom */}
        <motion.text
          x={cx} y={cy + r + 22}
          textAnchor="middle"
          fill="#71717a"
          fillOpacity="0.95"
          fontSize="6"
          fontFamily="monospace"
          animate={inView ? { opacity: [0, 0.95] } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.8, repeat: Infinity, repeatDelay: 1.8 }}
        >
          session + borrow + settlement fees
        </motion.text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

const panels = [
  {
    svg: <TokenSplitSVG />,
    tag: "Yield Tokenisation",
    title: "Split any xStock",
    desc: "Deposit TSLA, NVDA, GOOGL, AAPL, SPY, TBLL, GLD, or SLV into the vault. One xStock mints 1:1 dx for income and px for price exposure -- two tokens from a single underlying.",
  },
  {
    svg: <YieldCurveSVG />,
    tag: "Dividend Yield Engine",
    title: "Accumulate income 24/7",
    desc: "dx accrues rebases, borrow fees, and session settlement fees continuously. Pure income stream with zero price volatility exposure.",
  },
  {
    svg: <SessionSVG />,
    tag: "Session Protocol",
    title: "80% of fees flow to dx",
    desc: "Every swap, settlement, and borrow generates protocol fees. 80% distributes to dx holders. 20% funds the protocol treasury.",
  },
];

export default function CoreTechnology() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id="core-technology"
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative w-full overflow-hidden bg-muted/40 border-y border-border"
    >
      {/* Subtle radial tint behind section */}
      <div className="pointer-events-none absolute inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(77,122,0,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, letterSpacing: "0.3em" }}
            animate={inView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="inline-block text-xs font-semibold tracking-[0.2em] text-primary uppercase mb-4"
          >
            Core Technology
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-[family-name:var(--font-safira)] text-3xl sm:text-4xl text-foreground"
          >
            Built for yield, not speculation
          </motion.h2>
        </div>

        {/* Three panels */}
        <div className="grid gap-6 md:grid-cols-3">
          {panels.map((panel, i) => (
            <motion.div
              key={panel.tag}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/25 transition-colors"
            >
              {/* Corner accent */}
              <div className="pointer-events-none absolute top-0 left-0 w-16 h-16 rounded-tl-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full"
                  style={{ background: "linear-gradient(135deg, rgba(77,122,0,0.08) 0%, transparent 60%)" }}
                />
              </div>

              {/* SVG area */}
              <div className="mb-6">
                {panel.svg}
              </div>

              {/* Tag */}
              <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-primary mb-2">
                {panel.tag}
              </span>

              {/* Title */}
              <h3 className="text-base font-semibold text-foreground mb-3">
                {panel.title}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {panel.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
