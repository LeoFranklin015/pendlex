"use client";

import { useState, useEffect } from "react";
import { xStockAssets } from "./market-data";

const BENCHMARKS_URL = "https://benchmarks.pyth.network";

// Fetches 1-year historical prices and computes APY = (last - first) / first + 0.1
export function useStockApy() {
  const [apyMap, setApyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchAll() {
      const now = Math.floor(Date.now() / 1000);
      const oneYearAgo = now - 365 * 86400;

      const results: Record<string, number> = {};

      await Promise.all(
        xStockAssets
          .filter((a) => a.pythFeedId)
          .map(async (asset) => {
            try {
              const url = `${BENCHMARKS_URL}/v1/shims/tradingview/history?symbol=${encodeURIComponent(`Equity.US.${asset.symbol}/USD`)}&resolution=1W&from=${oneYearAgo}&to=${now}`;
              const res = await fetch(url);
              const data = await res.json();

              if (data.s === "ok" && data.c && data.c.length > 1) {
                const first = data.c[0];
                const last = data.c[data.c.length - 1];
                const yearReturn = (last - first) / first;
                results[asset.ticker] = yearReturn + 0.1;
              }
            } catch {
              // skip failed fetches
            }
          })
      );

      setApyMap(results);
    }

    fetchAll();
  }, []);

  return apyMap;
}
