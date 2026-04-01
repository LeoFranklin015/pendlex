"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  List,
  ChevronDown,
  Star,
  Circle,
} from "lucide-react";
import { type Asset } from "@/lib/market-data";
import { usePythPrices } from "@/lib/use-pyth-prices";

const filterOptions = ["All assets", "Stock", "ETF"];
const sortOptions = ["Name", "Price: High", "Price: Low", "24H Change"];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function LogoIcon({ asset, size = "md" }: { asset: Asset; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "size-8" : "size-10";
  if (asset.logo) {
    return (
      <img
        src={asset.logo}
        alt={asset.ticker}
        className={`${dim} rounded-lg shrink-0 object-cover`}
      />
    );
  }
  const letter = asset.symbol.slice(0, 2);
  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0`}
      style={{ backgroundColor: asset.color }}
    >
      {letter}
    </div>
  );
}

// ---- Top Section: Live Prices List ----

function TopGainers({ assets }: { assets: Asset[] }) {
  const gainers = [...assets]
    .filter((a) => a.price > 0 && a.change > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3);

  if (gainers.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-medium text-foreground">Top Gainers</h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          LIVE
        </span>
      </div>
      <div className="space-y-3">
        {gainers.map((a) => (
          <Link key={a.ticker} href={`/app/markets/${a.ticker}`}>
            <div className="flex items-center justify-between group cursor-pointer hover:bg-muted/20 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
              <div className="flex items-center gap-3">
                <LogoIcon asset={a} size="sm" />
                <div>
                  <p className="text-sm font-medium text-foreground">{a.ticker}</p>
                  <p className="text-xs text-muted-foreground">{a.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  ${a.price.toFixed(2)}
                </p>
                <p className="text-xs font-mono text-[#c8ff00]">
                  <TrendingUp className="size-3 inline mr-0.5" />
                  +{a.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TrendingAssets({ assets }: { assets: Asset[] }) {
  const trending = [...assets]
    .filter((a) => a.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  if (trending.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-medium text-foreground">Trending</h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          LIVE
        </span>
      </div>
      <div className="space-y-3">
        {trending.map((a) => {
          const positive = a.change >= 0;
          return (
            <Link key={a.ticker} href={`/app/markets/${a.ticker}`}>
              <div className="flex items-center justify-between group cursor-pointer hover:bg-muted/20 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <div className="flex items-center gap-3">
                  <LogoIcon asset={a} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.ticker}</p>
                    <p className="text-xs text-muted-foreground">{a.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    ${a.price.toFixed(2)}
                  </p>
                  <p className={`text-xs font-mono ${positive ? "text-[#c8ff00]" : "text-red-500"}`}>
                    {positive ? "+" : ""}{a.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AllAssetsList({ assets }: { assets: Asset[] }) {
  const loaded = assets.filter((a) => a.price > 0);
  if (loaded.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-medium text-foreground">All xStocks</h2>
      </div>
      <div className="space-y-3">
        {loaded.slice(0, 3).map((a) => {
          const positive = a.change >= 0;
          return (
            <Link key={a.ticker} href={`/app/markets/${a.ticker}`}>
              <div className="flex items-center justify-between group cursor-pointer hover:bg-muted/20 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <div className="flex items-center gap-3">
                  <LogoIcon asset={a} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.ticker}</p>
                    <p className="text-xs text-muted-foreground">{a.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    ${a.price.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {a.type}
                  </Badge>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---- Asset Card ----

function AssetCard({ asset }: { asset: Asset }) {
  const positive = asset.change >= 0;
  const loading = asset.price === 0;

  return (
    <Link href={`/app/markets/${asset.ticker}`}>
      <Card className="overflow-hidden hover:ring-foreground/20 transition-all cursor-pointer group">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoIcon asset={asset} />
            <div>
              <p className="text-sm font-medium text-foreground">{asset.ticker}</p>
              <p className="text-xs text-muted-foreground">{asset.name}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {asset.type}
          </Badge>
        </div>

        <div className="px-4 pb-4">
          {loading ? (
            <div className="h-16 flex items-center">
              <div className="h-3 w-24 bg-muted/50 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-semibold text-foreground tracking-tight">
                ${asset.price.toFixed(2)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs font-mono ${
                    positive ? "text-[#c8ff00]" : "text-red-500"
                  }`}
                >
                  {positive ? (
                    <TrendingUp className="size-3 inline mr-0.5" />
                  ) : (
                    <TrendingDown className="size-3 inline mr-0.5" />
                  )}
                  ${Math.abs(asset.change).toFixed(2)} (
                  {positive ? "+" : ""}
                  {asset.changePercent.toFixed(2)}%)
                </span>
                <Circle className="size-1 fill-[#c8ff00] text-[#c8ff00]" />
                <span className="text-[10px] text-muted-foreground">Pyth Live</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ---- Asset List Row ----

function AssetRow({ asset }: { asset: Asset }) {
  const positive = asset.change >= 0;
  const loading = asset.price === 0;

  return (
    <Link href={`/app/markets/${asset.ticker}`}>
      <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <LogoIcon asset={asset} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{asset.ticker}</p>
              <Badge variant="secondary" className="text-[10px]">
                {asset.type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
          </div>
        </div>

        <div className="text-right min-w-[120px]">
          {loading ? (
            <div className="h-3 w-20 bg-muted/50 rounded animate-pulse ml-auto" />
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                ${asset.price.toFixed(2)}
              </p>
              <p
                className={`text-xs font-mono ${
                  positive ? "text-[#c8ff00]" : "text-red-500"
                }`}
              >
                {positive ? "+" : ""}
                {asset.changePercent.toFixed(2)}%
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---- Main Page ----

export default function MarketsPage() {
  const assets = usePythPrices();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All assets");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("Name");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filtered = useMemo(() => {
    let result = [...assets];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.ticker.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q)
      );
    }

    if (activeFilter === "Stock") {
      result = result.filter((a) => a.type === "Stock");
    } else if (activeFilter === "ETF") {
      result = result.filter((a) => a.type === "ETF");
    }

    switch (sortBy) {
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
  }, [assets, search, activeFilter, sortBy]);

  return (
    <div className="p-4 md:p-6 pb-12 space-y-8 max-w-7xl mx-auto">
      {/* Top Section */}
      <motion.div
        {...fadeUp}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
      >
        <TopGainers assets={assets} />
        <TrendingAssets assets={assets} />
        <AllAssetsList assets={assets} />
      </motion.div>

      <div className="h-px bg-border/50" />

      {/* Explore Assets */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="font-[family-name:var(--font-safira)] text-xl md:text-2xl tracking-tight text-foreground">
              Explore xStocks
            </h2>
            <span className="text-xs text-muted-foreground align-super">
              *{assets.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Circle className="size-2 fill-[#c8ff00] text-[#c8ff00]" />
            <span>Pyth Network</span>
            <span className="text-[#c8ff00] font-medium">(Live)</span>
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

            {/* Filter pills */}
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setActiveFilter(opt)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  activeFilter === opt
                    ? "border-foreground/40 bg-foreground/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {opt}
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
