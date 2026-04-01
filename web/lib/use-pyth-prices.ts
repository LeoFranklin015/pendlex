"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { xStockAssets, type Asset } from "./market-data";

const HERMES_URL = "https://hermes.pyth.network";

interface PythParsedPrice {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

function parsePythPrice(raw: PythParsedPrice): {
  price: number;
  confidence: number;
  emaPrice: number;
} {
  const expo = raw.price.expo;
  const price = Number(raw.price.price) * Math.pow(10, expo);
  const confidence = Number(raw.price.conf) * Math.pow(10, expo);
  const emaPrice = Number(raw.ema_price.price) * Math.pow(10, expo);
  return { price, confidence, emaPrice };
}

export function usePythPrices() {
  const [assets, setAssets] = useState<Asset[]>(xStockAssets);
  const prevPricesRef = useRef<Record<string, number>>({});
  const emaPricesRef = useRef<Record<string, number>>({});
  const eventSourceRef = useRef<EventSource | null>(null);

  // Build the SSE stream URL for all feeds that have a Pyth feed ID
  const feedIds = xStockAssets
    .filter((a) => a.pythFeedId)
    .map((a) => a.pythFeedId);

  const fetchInitial = useCallback(async () => {
    if (feedIds.length === 0) return;

    try {
      const params = feedIds.map((id) => `ids[]=0x${id}`).join("&");
      const res = await fetch(
        `${HERMES_URL}/v2/updates/price/latest?${params}&parsed=true`
      );
      const data = await res.json();

      if (data.parsed) {
        const priceMap: Record<string, { price: number; conf: number; ema: number }> = {};
        for (const item of data.parsed as PythParsedPrice[]) {
          const parsed = parsePythPrice(item);
          priceMap[item.id] = {
            price: parsed.price,
            conf: parsed.confidence,
            ema: parsed.emaPrice,
          };
          emaPricesRef.current[item.id] = parsed.emaPrice;
        }

        setAssets((prev) =>
          prev.map((asset) => {
            if (!asset.pythFeedId) return asset;
            const data = priceMap[asset.pythFeedId];
            if (!data) return asset;

            // Use EMA as "previous close" proxy for change calculation
            const change = data.price - data.ema;
            const changePercent = data.ema > 0 ? (change / data.ema) * 100 : 0;

            prevPricesRef.current[asset.pythFeedId] = data.price;

            return {
              ...asset,
              price: data.price,
              prevPrice: data.ema,
              change: Math.round(change * 100) / 100,
              changePercent: Math.round(changePercent * 100) / 100,
              confidence: data.conf,
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to fetch Pyth prices:", err);
    }
  }, [feedIds]);

  // SSE streaming for real-time updates
  const startStream = useCallback(() => {
    if (feedIds.length === 0) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = feedIds.map((id) => `ids[]=0x${id}`).join("&");
    const url = `${HERMES_URL}/v2/updates/price/stream?${params}&parsed=true`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.parsed) return;

        const priceMap: Record<string, { price: number; conf: number }> = {};
        for (const item of data.parsed as PythParsedPrice[]) {
          const parsed = parsePythPrice(item);
          priceMap[item.id] = {
            price: parsed.price,
            conf: parsed.confidence,
          };
        }

        setAssets((prev) =>
          prev.map((asset) => {
            if (!asset.pythFeedId) return asset;
            const update = priceMap[asset.pythFeedId];
            if (!update) return asset;

            const ema = emaPricesRef.current[asset.pythFeedId] || asset.prevPrice;
            const change = update.price - ema;
            const changePercent = ema > 0 ? (change / ema) * 100 : 0;

            prevPricesRef.current[asset.pythFeedId] = update.price;

            return {
              ...asset,
              price: update.price,
              change: Math.round(change * 100) / 100,
              changePercent: Math.round(changePercent * 100) / 100,
              confidence: update.conf,
            };
          })
        );
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // Reconnect after 5 seconds
      es.close();
      setTimeout(startStream, 5000);
    };
  }, [feedIds]);

  useEffect(() => {
    fetchInitial().then(() => {
      startStream();
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return assets;
}
