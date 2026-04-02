"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type PublicClient, type Address, formatUnits } from "viem";
import { EXCHANGE_ABI } from "./abis/XStreamExchange";
import { fetchPythUpdateData } from "./pyth";
import { type ContractConfig } from "./addresses";

export interface StoredPosition {
  positionId: `0x${string}`;
  ticker: string;
  isLong: boolean;
  openedAt: number;
}

export interface PositionWithPnl extends StoredPosition {
  trader: Address;
  pxToken: Address;
  collateral: string;
  notional: string;
  entryPrice: string;
  pnl: string;
  collateralRemaining: string;
  isLiquidatable: boolean;
  leverage: string;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function storageKey(account: Address, chainId: number): string {
  return `xstream_positions_${account}_${chainId}`;
}

function loadStored(account: Address, chainId: number): StoredPosition[] {
  try {
    const raw = localStorage.getItem(storageKey(account, chainId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredPosition[];
  } catch {
    return [];
  }
}

function saveStored(account: Address, chainId: number, positions: StoredPosition[]): void {
  try {
    localStorage.setItem(storageKey(account, chainId), JSON.stringify(positions));
  } catch {
    // localStorage may be unavailable (SSR, private mode)
  }
}

export function usePositions(
  account: Address | undefined,
  chainId: number | undefined,
  publicClient: PublicClient | null,
  cfg: ContractConfig | null,
) {
  const [stored, setStored] = useState<StoredPosition[]>([]);
  const [positions, setPositions] = useState<PositionWithPnl[]>([]);
  const [loading, setLoading] = useState(false);

  // Refs to avoid infinite re-render loops from unstable object references
  const clientRef = useRef(publicClient);
  clientRef.current = publicClient;
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const storedRef = useRef(stored);
  storedRef.current = stored;

  // Load from localStorage when account/chainId become available
  useEffect(() => {
    if (!account || !chainId) {
      setStored([]);
      setPositions([]);
      return;
    }
    setStored(loadStored(account, chainId));
  }, [account, chainId]);

  const addPosition = useCallback(
    (pos: StoredPosition) => {
      if (!account || !chainId) return;
      setStored((prev) => {
        const next = prev.some((p) => p.positionId === pos.positionId)
          ? prev
          : [...prev, pos];
        saveStored(account, chainId, next);
        return next;
      });
    },
    [account, chainId],
  );

  const removePosition = useCallback(
    (positionId: `0x${string}`) => {
      if (!account || !chainId) return;
      setStored((prev) => {
        const next = prev.filter((p) => p.positionId !== positionId);
        saveStored(account, chainId, next);
        return next;
      });
    },
    [account, chainId],
  );

  const refreshPositions = useCallback(async () => {
    const pc = clientRef.current;
    const c = cfgRef.current;
    const s = storedRef.current;

    if (!account || !chainId || !pc || !c || s.length === 0) {
      setPositions([]);
      return;
    }

    setLoading(true);
    try {
      const exchangeAddress = c.exchange as Address;
      const pythContractAddress = c.pythContract as Address;

      // Collect all unique feedIds needed
      const feedIds = c.assets.map((a) => a.pythFeedId);

      // Fetch fresh Pyth update data once for all positions
      const { updateData } = await fetchPythUpdateData(feedIds, pythContractAddress, pc);

      const results: PositionWithPnl[] = [];

      for (const sp of s) {
        try {
          // Read on-chain position data
          const pos = await pc.readContract({
            address: exchangeAddress,
            abi: EXCHANGE_ABI,
            functionName: "getPosition",
            args: [sp.positionId],
          });

          const [trader, pxToken, , collateralRaw, notionalRaw, entryPriceRaw] = pos as [
            Address,
            Address,
            boolean,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
          ];

          // Skip closed positions
          if (trader.toLowerCase() === ZERO_ADDRESS) {
            continue;
          }

          // Get unrealized PnL -- getUnrealizedPnl is payable but we call it
          // via simulateContract since we only need the return values
          const pnlResult = await pc.simulateContract({
            address: exchangeAddress,
            abi: EXCHANGE_ABI,
            functionName: "getUnrealizedPnl",
            args: [sp.positionId, updateData],
            account,
          });

          const [pnlRaw, collateralRemainingRaw, isLiquidatable] = pnlResult.result as [
            bigint,
            bigint,
            boolean,
          ];

          const collateralNum = parseFloat(formatUnits(collateralRaw, 6));
          const notionalNum = parseFloat(formatUnits(notionalRaw, 6));
          const leverage =
            collateralNum > 0 ? (notionalNum / collateralNum).toFixed(2) : "0";

          results.push({
            ...sp,
            trader,
            pxToken,
            collateral: formatUnits(collateralRaw, 6),
            notional: formatUnits(notionalRaw, 6),
            entryPrice: (Number(entryPriceRaw) / 1e8).toFixed(2),
            pnl: formatUnits(pnlRaw, 6),
            collateralRemaining: formatUnits(collateralRemainingRaw, 6),
            isLiquidatable,
            leverage,
          });
        } catch {
          // Skip positions that fail to load (e.g. network error for a single position)
          continue;
        }
      }

      setPositions(results);
    } catch {
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [account, chainId]);

  return { stored, positions, loading, addPosition, removePosition, refreshPositions };
}
