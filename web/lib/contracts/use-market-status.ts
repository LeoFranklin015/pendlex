"use client";

import { useState, useEffect, useRef } from "react";
import { type PublicClient, type Address } from "viem";
import { MARKET_KEEPER_ABI } from "./abis/MarketKeeper";

export function useMarketStatus(
  publicClient: PublicClient | null,
  marketKeeperAddress: Address | undefined,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs to avoid re-creating the effect when the caller passes a new client object each render
  const clientRef = useRef(publicClient);
  clientRef.current = publicClient;
  const addrRef = useRef(marketKeeperAddress);
  addrRef.current = marketKeeperAddress;

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const client = clientRef.current;
      const addr = addrRef.current;
      if (!client || !addr) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const open = await client.readContract({
          address: addr,
          abi: MARKET_KEEPER_ABI,
          functionName: "isMarketOpen",
        });
        if (!cancelled) setIsOpen(open as boolean);
      } catch {
        if (!cancelled) setIsOpen(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    const id = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { isOpen, loading };
}
