"use client";

import { useState, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  type Abi,
  type Address,
  type Chain,
  encodeFunctionData,
} from "viem";
import { getPublicClient, getWalletClient } from "./client";
import { DEFAULT_CHAIN } from "./config";

// ── Read (no wallet needed) ──────────────────────────────────────────

export function useContractRead(opts: {
  address: Address;
  abi: Abi;
  functionName: string;
  chain?: Chain;
}) {
  const [data, setData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const read = useCallback(
    async (args?: unknown[]) => {
      setIsLoading(true);
      setError(null);
      try {
        const client = getPublicClient(opts.chain ?? DEFAULT_CHAIN);
        const result = await client.readContract({
          address: opts.address,
          abi: opts.abi,
          functionName: opts.functionName,
          args,
        } as Parameters<typeof client.readContract>[0]);
        setData(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [opts.address, opts.abi, opts.functionName, opts.chain]
  );

  return { data, isLoading, error, read };
}

// ── Write (needs Privy wallet) ───────────────────────────────────────

export function useContractWrite(opts: {
  address: Address;
  abi: Abi;
  functionName: string;
  chain?: Chain;
}) {
  const { wallets } = useWallets();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const write = useCallback(
    async (args?: unknown[], value?: bigint) => {
      setIsLoading(true);
      setError(null);
      setTxHash(null);
      try {
        // Get the first connected wallet from Privy
        const wallet = wallets[0];
        if (!wallet) throw new Error("No wallet connected");

        const chain = opts.chain ?? DEFAULT_CHAIN;

        // Switch to the correct chain
        await wallet.switchChain(chain.id);

        // Get the EIP-1193 provider from Privy
        const provider = await wallet.getEthereumProvider();
        const walletClient = getWalletClient(provider, chain);

        // Encode the call
        const calldata = encodeFunctionData({
          abi: opts.abi,
          functionName: opts.functionName,
          args: args ?? [],
        } as Parameters<typeof encodeFunctionData>[0]);

        // Send the transaction
        const hash = await walletClient.sendTransaction({
          account: wallet.address as `0x${string}`,
          chain,
          to: opts.address,
          data: calldata,
          value,
        });

        setTxHash(hash);
        return hash;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [wallets, opts.address, opts.abi, opts.functionName, opts.chain]
  );

  // Wait for tx receipt
  const waitForReceipt = useCallback(
    async (hash: `0x${string}`) => {
      const client = getPublicClient(opts.chain ?? DEFAULT_CHAIN);
      return client.waitForTransactionReceipt({ hash });
    },
    [opts.chain]
  );

  return { txHash, isLoading, error, write, waitForReceipt };
}
