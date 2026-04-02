"use client";

import { useState, useCallback } from "react";
import {
  type Address,
  type PublicClient,
  type WalletClient,
  getContract,
  formatUnits,
} from "viem";
import { ERC20_ABI } from "./abis/ERC20";

export function getErc20Contract(
  address: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
) {
  return getContract({
    address,
    abi: ERC20_ABI,
    client: walletClient
      ? { public: publicClient, wallet: walletClient }
      : { public: publicClient },
  });
}

export async function ensureApproval(
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
  account: Address,
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<void> {
  const token = getErc20Contract(tokenAddress, publicClient, walletClient);
  const current = await token.read.allowance([account, spender]);
  if (current < amount) {
    const hash = await token.write.approve([spender, amount], { account });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

export function useErc20Balance(
  tokenAddress: Address | undefined,
  account: Address | undefined,
  publicClient: PublicClient | null,
  decimals: number = 18,
) {
  const [balance, setBalance] = useState<string>("0");
  const [rawBalance, setRawBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tokenAddress || !account || !publicClient) return;
    setLoading(true);
    try {
      const token = getErc20Contract(tokenAddress, publicClient);
      const raw = await token.read.balanceOf([account]);
      setRawBalance(raw);
      setBalance(formatUnits(raw, decimals));
    } catch {
      // ignore read errors
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, account, publicClient, decimals]);

  return { balance, rawBalance, loading, refresh };
}
