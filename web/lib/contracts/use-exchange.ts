"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  parseUnits,
  decodeEventLog,
  type Address,
} from "viem";
import { inkSepolia, sepolia } from "viem/chains";
import { useContractMode } from "@/lib/contract-mode-context";
import { getContractConfig, getAssetByTicker } from "./addresses";
import { EXCHANGE_ABI } from "./abis/XStreamExchange";
import { fetchPythUpdateData } from "./pyth";
import { ensureApproval } from "./use-erc20";
import { getPublicClient, getWalletClient } from "./client";

function getChain(chainId: number) {
  if (chainId === 763373) return inkSepolia;
  if (chainId === 11155111) return sepolia;
  throw new Error(`Unsupported chain: ${chainId}`);
}

export function useExchange() {
  const { wallets } = useWallets();
  const { contractMode } = useContractMode();

  const wallet = wallets[0] ?? null;
  const account = (wallet?.address ?? null) as Address | null;
  const chainId = wallet
    ? parseInt(wallet.chainId.split(":")[1], 10)
    : null;
  const cfg = chainId != null ? getContractConfig(chainId, contractMode) : null;
  const publicClient = chainId != null ? getPublicClient(getChain(chainId)) : null;

  const openLong = useCallback(
    async (ticker: string, collateralUsdc: number, leverage: number) => {
      if (!wallet || !account || !cfg || chainId == null) {
        throw new Error("Wallet not connected");
      }

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const chain = getChain(chainId);
      const pubClient = getPublicClient(chain);
      const provider = await wallet.getEthereumProvider();
      const walClient = getWalletClient(provider, chain);

      const rawCollateral = parseUnits(String(collateralUsdc), 6);
      const rawLeverage = BigInt(Math.floor(leverage * 1e18));

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract as Address,
        pubClient,
      );

      await ensureApproval(
        cfg.usdc as Address,
        cfg.exchange as Address,
        rawCollateral,
        account,
        pubClient,
        walClient,
      );

      const hash = await walClient.writeContract({
        address: cfg.exchange as Address,
        abi: EXCHANGE_ABI,
        functionName: "openLong",
        args: [asset.pxToken as Address, rawCollateral, rawLeverage, updateData],
        value: fee,
        account,
        chain,
      });

      const receipt = await pubClient.waitForTransactionReceipt({ hash });

      const positionEvent = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({ abi: EXCHANGE_ABI, data: log.data, topics: log.topics });
          } catch {
            return null;
          }
        })
        .find((e) => e?.eventName === "PositionOpened");

      const positionId = positionEvent?.args
        ? (positionEvent.args as { positionId: `0x${string}` }).positionId
        : null;

      return { receipt, positionId };
    },
    [wallet, account, cfg, chainId],
  );

  const openShort = useCallback(
    async (ticker: string, collateralUsdc: number, leverage: number) => {
      if (!wallet || !account || !cfg || chainId == null) {
        throw new Error("Wallet not connected");
      }

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const chain = getChain(chainId);
      const pubClient = getPublicClient(chain);
      const provider = await wallet.getEthereumProvider();
      const walClient = getWalletClient(provider, chain);

      const rawCollateral = parseUnits(String(collateralUsdc), 6);
      const rawLeverage = BigInt(Math.floor(leverage * 1e18));

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract as Address,
        pubClient,
      );

      await ensureApproval(
        cfg.usdc as Address,
        cfg.exchange as Address,
        rawCollateral,
        account,
        pubClient,
        walClient,
      );

      const hash = await walClient.writeContract({
        address: cfg.exchange as Address,
        abi: EXCHANGE_ABI,
        functionName: "openShort",
        args: [asset.pxToken as Address, rawCollateral, rawLeverage, updateData],
        value: fee,
        account,
        chain,
      });

      const receipt = await pubClient.waitForTransactionReceipt({ hash });

      const positionEvent = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({ abi: EXCHANGE_ABI, data: log.data, topics: log.topics });
          } catch {
            return null;
          }
        })
        .find((e) => e?.eventName === "PositionOpened");

      const positionId = positionEvent?.args
        ? (positionEvent.args as { positionId: `0x${string}` }).positionId
        : null;

      return { receipt, positionId };
    },
    [wallet, account, cfg, chainId],
  );

  const closeLong = useCallback(
    async (positionId: `0x${string}`, ticker: string) => {
      if (!wallet || !account || !cfg || chainId == null) {
        throw new Error("Wallet not connected");
      }

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const chain = getChain(chainId);
      const pubClient = getPublicClient(chain);
      const provider = await wallet.getEthereumProvider();
      const walClient = getWalletClient(provider, chain);

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract as Address,
        pubClient,
      );

      const hash = await walClient.writeContract({
        address: cfg.exchange as Address,
        abi: EXCHANGE_ABI,
        functionName: "closeLong",
        args: [positionId, updateData],
        value: fee,
        account,
        chain,
      });

      return pubClient.waitForTransactionReceipt({ hash });
    },
    [wallet, account, cfg, chainId],
  );

  const closeShort = useCallback(
    async (positionId: `0x${string}`, ticker: string) => {
      if (!wallet || !account || !cfg || chainId == null) {
        throw new Error("Wallet not connected");
      }

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const chain = getChain(chainId);
      const pubClient = getPublicClient(chain);
      const provider = await wallet.getEthereumProvider();
      const walClient = getWalletClient(provider, chain);

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract as Address,
        pubClient,
      );

      const hash = await walClient.writeContract({
        address: cfg.exchange as Address,
        abi: EXCHANGE_ABI,
        functionName: "closeShort",
        args: [positionId, updateData],
        value: fee,
        account,
        chain,
      });

      return pubClient.waitForTransactionReceipt({ hash });
    },
    [wallet, account, cfg, chainId],
  );

  return {
    openLong,
    openShort,
    closeLong,
    closeShort,
    account,
    chainId,
    cfg,
    publicClient,
    connected: !!account,
  };
}
