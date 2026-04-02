"use client";

import { useState, useEffect, useCallback } from "react";
import { type PublicClient, type Address } from "viem";
import { MARKET_KEEPER_ABI } from "./abis/MarketKeeper";

export function useMarketStatus(
  publicClient: PublicClient | null,
  marketKeeperAddress: Address | undefined,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!publicClient || !marketKeeperAddress) {
      setLoading(false);
      return;
    }
    try {
      const open = await publicClient.readContract({
        address: marketKeeperAddress,
        abi: MARKET_KEEPER_ABI,
        functionName: "isMarketOpen",
      });
      setIsOpen(open as boolean);
    } catch {
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, [publicClient, marketKeeperAddress]);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  return { isOpen, loading, refresh: check };
}
