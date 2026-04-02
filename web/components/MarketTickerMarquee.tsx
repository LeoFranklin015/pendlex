"use client";

import Link from "next/link";
import { type Asset } from "@/lib/market-data";
import { usePythPrices } from "@/lib/use-pyth-prices";

/** Matches markets page LogoIcon; xs fits the header ticker row */
function LogoIcon({ asset, size = "xs" }: { asset: Asset; size?: "xs" | "sm" | "md" }) {
  const dim = size === "xs" ? "size-6" : size === "sm" ? "size-8" : "size-10";
  if (asset.logo) {
    return (
      <img
        src={asset.logo}
        alt={asset.ticker}
        className={`${dim} shrink-0 rounded-lg object-cover`}
      />
    );
  }
  const letter = asset.symbol.slice(0, 2);
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white`}
      style={{ backgroundColor: asset.color }}
    >
      {letter}
    </div>
  );
}

function TickerItem({ asset }: { asset: Asset }) {
  const { ticker, price, changePercent } = asset;
  const loaded = price > 0;
  const positive = changePercent >= 0;
  return (
    <Link
      href={`/app/markets/${ticker}`}
      className="inline-flex items-center gap-2.5 px-4 text-[11px] font-mono tabular-nums text-foreground/90 transition-colors hover:text-primary shrink-0 border-r border-border/30 last:border-r-0"
    >
      <LogoIcon asset={asset} size="xs" />
      <span className="font-semibold tracking-tight text-foreground">{ticker}</span>
      <span className="text-muted-foreground">
        {loaded ? `$${price.toFixed(2)}` : "--"}
      </span>
      {loaded && (
        <span className={positive ? "text-primary" : "text-red-500"}>
          {positive ? "+" : ""}
          {changePercent.toFixed(2)}%
        </span>
      )}
    </Link>
  );
}

export function MarketTickerMarquee() {
  const assets = usePythPrices();
  const rows = assets.filter((a) => a.pythFeedId);

  const strip = (suffix: string) =>
    rows.map((a) => <TickerItem key={`${a.ticker}${suffix}`} asset={a} />);

  return (
    <div
      className="relative ml-2 hidden min-w-0 flex-1 overflow-hidden sm:block"
      aria-label="Live xStock tickers"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-sidebar/95 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-sidebar/95 to-transparent"
        aria-hidden
      />
      <div className="ticker-marquee-track flex w-max hover:paused">
        <div className="flex shrink-0 items-stretch">{strip("")}</div>
        <div className="flex shrink-0 items-stretch" aria-hidden>
          {strip("-dup")}
        </div>
      </div>
    </div>
  );
}
