"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Candle } from "@/components/candlestick-chart";

const BENCHMARKS_URL = "https://benchmarks.pyth.network";
const HERMES_URL = "https://hermes.pyth.network";

// Map our timeframe labels to resolution values for the TradingView shim
const RESOLUTION_MAP: Record<string, { resolution: string; seconds: number; lookback: number }> = {
  "1m":  { resolution: "1",   seconds: 60,     lookback: 4 * 3600 },
  "5m":  { resolution: "5",   seconds: 300,    lookback: 24 * 3600 },
  "15m": { resolution: "15",  seconds: 900,    lookback: 3 * 86400 },
  "1h":  { resolution: "60",  seconds: 3600,   lookback: 7 * 86400 },
  "4h":  { resolution: "240", seconds: 14400,  lookback: 30 * 86400 },
  "D":   { resolution: "1D",  seconds: 86400,  lookback: 180 * 86400 },
  "W":   { resolution: "1W",  seconds: 604800, lookback: 365 * 86400 },
  "M":   { resolution: "1M",  seconds: 2592000, lookback: 730 * 86400 },
};

// Pyth symbol for a given underlying
function pythSymbol(symbol: string): string {
  return `Equity.US.${symbol}/USD`;
}

interface TvHistoryResponse {
  s: string;
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

export function usePythCandles(
  symbol: string,
  pythFeedId: string,
  timeframe: string
) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentCandleRef = useRef<Candle | null>(null);
  const lastCandleTimeRef = useRef<number>(0);

  const config = useMemo(() => RESOLUTION_MAP[timeframe] || RESOLUTION_MAP["5m"], [timeframe]);

  // Fetch historical OHLC from Pyth Benchmarks TradingView shim
  const fetchHistory = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);

    try {
      const now = Math.floor(Date.now() / 1000);
      const from = now - config.lookback;
      const url = `${BENCHMARKS_URL}/v1/shims/tradingview/history?symbol=${encodeURIComponent(pythSymbol(symbol))}&resolution=${config.resolution}&from=${from}&to=${now}`;

      const res = await fetch(url);
      const data: TvHistoryResponse = await res.json();

      if (data.s === "ok" && data.t.length > 0) {
        const raw: Candle[] = data.t.map((t, i) => ({
          time: String(t),
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
          volume: data.v[i] || 0,
        }));

        // For intraday, filter to NYSE regular hours only (13:30-20:00 UTC / 9:30-4:00 ET)
        // This removes pre-market, post-market, and overnight bars that create visual gaps
        const isIntraday = ["1m", "5m", "15m", "1h", "4h"].includes(timeframe);
        const bars = isIntraday
          ? raw.filter((bar) => {
              const d = new Date(Number(bar.time) * 1000);
              const utcH = d.getUTCHours();
              const utcM = d.getUTCMinutes();
              const mins = utcH * 60 + utcM;
              const day = d.getUTCDay();
              // NYSE: Mon-Fri 13:30-20:00 UTC (810-1200 mins)
              return day >= 1 && day <= 5 && mins >= 810 && mins < 1200;
            })
          : raw;

        setCandles(bars);
        if (bars.length > 0) {
          lastCandleTimeRef.current = Number(bars[bars.length - 1].time);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Pyth history:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, config.resolution, config.lookback]);

  // Stream live price ticks and update/append the last candle
  const startStream = useCallback(() => {
    if (!pythFeedId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${HERMES_URL}/v2/updates/price/stream?ids[]=0x${pythFeedId}&parsed=true`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.parsed || !data.parsed[0]) return;

        const raw = data.parsed[0];
        const price = Number(raw.price.price) * Math.pow(10, raw.price.expo);
        const publishTime = raw.price.publish_time;

        // Determine which candle bucket this tick belongs to
        const candleBucket = Math.floor(publishTime / config.seconds) * config.seconds;

        setCandles((prev) => {
          if (prev.length === 0) return prev;

          const updated = [...prev];
          const lastIdx = updated.length - 1;
          const lastBar = updated[lastIdx];
          const lastBarTime = Number(lastBar.time);

          if (candleBucket === lastBarTime) {
            // Update the existing last candle
            updated[lastIdx] = {
              ...lastBar,
              high: Math.max(lastBar.high, price),
              low: Math.min(lastBar.low, price),
              close: price,
            };
          } else if (candleBucket > lastBarTime) {
            // New candle
            updated.push({
              time: String(candleBucket),
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 0,
            });
          }

          return updated;
        });
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(startStream, 5000);
    };
  }, [pythFeedId, config.seconds]);

  // Re-fetch history when symbol or timeframe changes
  useEffect(() => {
    fetchHistory().then(() => {
      startStream();
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [fetchHistory, startStream]);

  return { candles, loading };
}
