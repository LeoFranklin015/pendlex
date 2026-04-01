"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  List,
  ChevronDown,
  Star,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// ---- Mock data ----

interface Asset {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  category: string[];
  color: string;
  sparkline: { v: number }[];
}

function spark(base: number, positive: boolean): { v: number }[] {
  return Array.from({ length: 30 }, (_, i) => {
    const trend = positive ? i * 0.015 : -i * 0.012;
    const noise =
      Math.sin(i * 0.7) * 0.03 +
      Math.cos(i * 0.4) * 0.02 +
      Math.sin(i * 1.1) * 0.015;
    return { v: +(base * (1 + trend + noise)).toFixed(2) };
  });
}

const assets: Asset[] = [
  {
    ticker: "NVDAon",
    name: "NVIDIA",
    price: 176.52,
    change: 3.55,
    changePercent: 2.05,
    marketCap: 97605364,
    volume: 12400000,
    category: ["Technology", "Large Cap", "Growth"],
    color: "#76b900",
    sparkline: spark(176, true),
  },
  {
    ticker: "INTCon",
    name: "Intel",
    price: 48.4,
    change: 4.82,
    changePercent: 11.05,
    marketCap: 88814970,
    volume: 8200000,
    category: ["Technology", "Large Cap", "Value"],
    color: "#0071c5",
    sparkline: spark(44, true),
  },
  {
    ticker: "TQQQon",
    name: "ProShares UltraPro QQQ",
    price: 43.89,
    change: 2.77,
    changePercent: 6.74,
    marketCap: 80421200,
    volume: 15000000,
    category: ["ETF", "Growth"],
    color: "#7b2ff7",
    sparkline: spark(41, true),
  },
  {
    ticker: "SNDKon",
    name: "SanDisk",
    price: 708.46,
    change: 89.82,
    changePercent: 14.5,
    marketCap: 42000000,
    volume: 3200000,
    category: ["Technology", "Growth"],
    color: "#e4002b",
    sparkline: spark(620, true),
  },
  {
    ticker: "MUon",
    name: "Micron Technology",
    price: 374.76,
    change: 46.27,
    changePercent: 14.09,
    marketCap: 55000000,
    volume: 5100000,
    category: ["Technology", "Large Cap", "Growth"],
    color: "#00539b",
    sparkline: spark(330, true),
  },
  {
    ticker: "WDCon",
    name: "Western Digital",
    price: 303.69,
    change: 36.75,
    changePercent: 13.67,
    marketCap: 35000000,
    volume: 2800000,
    category: ["Technology", "Value"],
    color: "#6b21a8",
    sparkline: spark(267, true),
  },
  {
    ticker: "WMon",
    name: "Waste Management",
    price: 231.24,
    change: 1.12,
    changePercent: 0.49,
    marketCap: 73000000,
    volume: 1900000,
    category: ["Consumer", "Large Cap", "Value"],
    color: "#00843d",
    sparkline: spark(230, true),
  },
  {
    ticker: "VRTXon",
    name: "Vertex Pharmaceuticals",
    price: 448.75,
    change: 5.23,
    changePercent: 1.18,
    marketCap: 68000000,
    volume: 2100000,
    category: ["Financials", "Large Cap", "Growth"],
    color: "#5b2d8e",
    sparkline: spark(443, true),
  },
  {
    ticker: "NKEon",
    name: "Nike",
    price: 45.9,
    change: -7.3,
    changePercent: -13.71,
    marketCap: 61000000,
    volume: 9800000,
    category: ["Consumer", "Large Cap"],
    color: "#111111",
    sparkline: spark(53, false),
  },
  {
    ticker: "SPYon",
    name: "SPDR S&P 500 ETF",
    price: 662.0,
    change: 11.46,
    changePercent: 1.76,
    marketCap: 520000000,
    volume: 42000000,
    category: ["ETF", "Large Cap", "Value"],
    color: "#7b2ff7",
    sparkline: spark(650, true),
  },
  {
    ticker: "AAPLon",
    name: "Apple",
    price: 212.38,
    change: 2.14,
    changePercent: 1.02,
    marketCap: 320000000,
    volume: 35000000,
    category: ["Technology", "Large Cap", "Growth"],
    color: "#555555",
    sparkline: spark(210, true),
  },
  {
    ticker: "MSFTon",
    name: "Microsoft",
    price: 425.11,
    change: -3.22,
    changePercent: -0.75,
    marketCap: 310000000,
    volume: 22000000,
    category: ["Technology", "Large Cap", "Growth"],
    color: "#00a4ef",
    sparkline: spark(428, false),
  },
];

const categories = [
  "All assets",
  "ETF",
  "Technology",
  "Consumer",
  "Financials",
  "Large Cap",
  "Growth",
  "Value",
];

const sortOptions = ["Most Popular", "Price: High", "Price: Low", "24H Change"];

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, seen };
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatCompact(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(0) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

function LogoIcon({ ticker, color }: { ticker: string; color: string }) {
  const letter = ticker.replace(/on$/, "").slice(0, 2);
  return (
    <div
      className="size-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {letter}
    </div>
  );
}

// ---- Top Section Lists ----

function TopGainers() {
  const gainers = [...assets]
    .filter((a) => a.change > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-medium text-foreground">Top Gainers</h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          24H
        </span>
      </div>
      <div className="space-y-3">
        {gainers.map((a) => (
          <div
            key={a.ticker}
            className="flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LogoIcon ticker={a.ticker} color={a.color} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {a.ticker}
                </p>
                <p className="text-xs text-muted-foreground">{a.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                ${a.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-mono text-[#c8ff00]">
                <TrendingUp className="size-3 inline mr-0.5" />
                {a.changePercent.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Trending() {
  const trending = [...assets]
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-medium text-foreground">Trending</h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          24H
        </span>
      </div>
      <div className="space-y-3">
        {trending.map((a) => (
          <div
            key={a.ticker}
            className="flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LogoIcon ticker={a.ticker} color={a.color} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {a.ticker}
                </p>
                <p className="text-xs text-muted-foreground">{a.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                ${a.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCompact(a.marketCap)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewlyAdded() {
  const newest = assets.slice(-3).reverse();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-medium text-foreground">Newly Added</h2>
      </div>
      <div className="space-y-3">
        {newest.map((a) => (
          <div
            key={a.ticker}
            className="flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LogoIcon ticker={a.ticker} color={a.color} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {a.ticker}
                </p>
                <p className="text-xs text-muted-foreground">{a.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                ${a.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Equities Stock</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Asset Card ----

function AssetCard({ asset }: { asset: Asset }) {
  const positive = asset.change >= 0;
  const bgColor = positive
    ? "rgba(200, 255, 0, 0.06)"
    : "rgba(255, 68, 68, 0.06)";
  const strokeColor = positive ? "#c8ff00" : "#ff4444";
  const gradientId = `grad-${asset.ticker}`;
  const { ref, seen } = useInView();

  return (
    <Card ref={ref} className="overflow-hidden hover:ring-foreground/20 transition-all cursor-pointer group">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <LogoIcon ticker={asset.ticker} color={asset.color} />
        <div>
          <p className="text-sm font-medium text-foreground">{asset.ticker}</p>
          <p className="text-xs text-muted-foreground">{asset.name}</p>
        </div>
      </div>

      <div className="mx-3 mb-3 rounded-lg overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div className="px-4 pt-3">
          <p className="text-2xl font-semibold text-foreground tracking-tight">
            ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p
            className={`text-xs font-mono mt-0.5 tracking-wide ${
              positive ? "text-[#c8ff00]" : "text-red-500"
            }`}
          >
            {positive ? (
              <TrendingUp className="size-3 inline mr-0.5" />
            ) : (
              <TrendingDown className="size-3 inline mr-0.5" />
            )}
            ${Math.abs(asset.change).toFixed(2)} (
            {Math.abs(asset.changePercent).toFixed(2)}%) 24H
          </p>
        </div>

        <div className="h-[100px] mt-1">
          {seen && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={asset.sparkline}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                    <stop
                      offset="100%"
                      stopColor={strokeColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---- Asset List Row ----

function AssetRow({ asset }: { asset: Asset }) {
  const positive = asset.change >= 0;
  const { ref, seen } = useInView();

  return (
    <div ref={ref} className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 min-w-0">
        <LogoIcon ticker={asset.ticker} color={asset.color} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{asset.ticker}</p>
          <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="w-[100px] h-[40px] hidden sm:block">
          {seen && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={asset.sparkline}
                margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
              >
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={positive ? "#c8ff00" : "#ff4444"}
                  strokeWidth={1.5}
                  fill="transparent"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="text-right min-w-[90px]">
          <p className="text-sm font-medium text-foreground">
            ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p
            className={`text-xs font-mono ${
              positive ? "text-green-500" : "text-red-500"
            }`}
          >
            {positive ? "+" : ""}
            {asset.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All assets");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("Most Popular");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filtered = useMemo(() => {
    let result = [...assets];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.ticker.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
      );
    }

    if (activeCategory !== "All assets") {
      result = result.filter((a) => a.category.includes(activeCategory));
    }

    switch (sortBy) {
      case "Most Popular":
        result.sort((a, b) => b.volume - a.volume);
        break;
      case "Price: High":
        result.sort((a, b) => b.price - a.price);
        break;
      case "Price: Low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "24H Change":
        result.sort((a, b) => b.changePercent - a.changePercent);
        break;
    }

    return result;
  }, [search, activeCategory, sortBy]);

  return (
    <div className="p-4 md:p-6 pb-12 space-y-8 max-w-7xl mx-auto">
      {/* Top Section: Gainers / Trending / Newly Added */}
      <motion.div
        {...fadeUp}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
      >
        <TopGainers />
        <Trending />
        <NewlyAdded />
      </motion.div>

      <div className="h-px bg-border/50" />

      {/* Explore Assets */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="font-[family-name:var(--font-safira)] text-xl md:text-2xl tracking-tight text-foreground">
              Explore Assets
            </h2>
            <span className="text-xs text-muted-foreground align-super">
              *{assets.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3.5" />
            <span>Market Open</span>
            <span className="text-[#c8ff00] font-medium">(Regular)</span>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {/* Search */}
            <div className="relative shrink-0 w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search asset name or ticker"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-muted/30 border-border/50"
              />
            </div>

            {/* Category pills */}
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? "border-foreground/40 bg-foreground/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {cat}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-border/50 p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="size-4" />
                </button>
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors"
                >
                  {sortBy}
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-border/50 bg-card shadow-lg py-1">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setSortBy(opt);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            sortBy === opt
                              ? "text-[#c8ff00] bg-muted/30"
                              : "text-foreground hover:bg-muted/30"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Asset Grid / List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No assets found matching your search.
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((asset, i) => (
              <motion.div
                key={asset.ticker}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <AssetCard asset={asset} />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            {filtered.map((asset, i) => (
              <motion.div
                key={asset.ticker}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <AssetRow asset={asset} />
              </motion.div>
            ))}
          </Card>
        )}
      </motion.div>
    </div>
  );
}
