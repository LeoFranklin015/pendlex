"use client";

import { useState, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { inkSepolia, sepolia } from "viem/chains";
import { useContractMode } from "@/lib/contract-mode-context";
import { getContractConfig, getAssetBySymbol } from "./addresses";
import { VAULT_ABI, ERC20_ABI } from "./abis";

function getChainFromWallet(wallet: { chainId: string }) {
  // Privy chainId can be "eip155:763373" or just "763373"
  const raw = wallet.chainId;
  const chainId = parseInt(raw.includes(":") ? raw.split(":")[1] : raw);
  return { chain: chainId === 763373 ? inkSepolia : sepolia, chainId };
}

async function ensureApproval(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any,
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
  account: `0x${string}`
) {
  const current = (await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account, spender],
  })) as bigint;

  if (current < amount) {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
      account,
      gas: BigInt(100000),
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

export function useVault() {
  const { wallets } = useWallets();
  const { isMock } = useContractMode();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const getClients = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");

    const { chain, chainId } = getChainFromWallet(wallet);
    const cfg = getContractConfig(chainId, isMock ? "mock" : "prod");
    const provider = await wallet.getEthereumProvider();

    const publicClient = createPublicClient({ chain, transport: http() });
    const walletClient = createWalletClient({
      chain,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport: custom(provider as any),
    });

    return {
      publicClient,
      walletClient,
      cfg,
      chainId,
      account: wallet.address as `0x${string}`,
    };
  }, [wallets, isMock]);

  const deposit = useCallback(
    async (symbol: string, amount: string) => {
      setIsLoading(true);
      setError(null);
      setTxHash(null);
      try {
        const { publicClient, walletClient, cfg, account } =
          await getClients();
        const asset = getAssetBySymbol(cfg, symbol);
        if (!asset) throw new Error(`Asset ${symbol} not found`);

        const rawAmount = parseUnits(amount, 18);
        const vaultAddress = cfg.vault as `0x${string}`;

        await ensureApproval(
          publicClient,
          walletClient,
          asset.xStock as `0x${string}`,
          vaultAddress,
          rawAmount,
          account
        );

        const hash = await walletClient.writeContract({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "deposit",
          args: [asset.xStock, rawAmount],
          account,
          gas: BigInt(500000),
        });

        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getClients]
  );

  const withdraw = useCallback(
    async (symbol: string, amount: string) => {
      setIsLoading(true);
      setError(null);
      setTxHash(null);
      try {
        const { publicClient, walletClient, cfg, account } =
          await getClients();
        const asset = getAssetBySymbol(cfg, symbol);
        if (!asset) throw new Error(`Asset ${symbol} not found`);

        const rawAmount = parseUnits(amount, 18);
        const vaultAddress = cfg.vault as `0x${string}`;

        await ensureApproval(
          publicClient,
          walletClient,
          asset.pxToken as `0x${string}`,
          vaultAddress,
          rawAmount,
          account
        );
        await ensureApproval(
          publicClient,
          walletClient,
          asset.dxToken as `0x${string}`,
          vaultAddress,
          rawAmount,
          account
        );

        const hash = await walletClient.writeContract({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "withdraw",
          args: [asset.xStock, rawAmount],
          account,
          gas: BigInt(500000),
        });

        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getClients]
  );

  const claimDividend = useCallback(
    async (symbol: string) => {
      setIsLoading(true);
      setError(null);
      setTxHash(null);
      try {
        const { publicClient, walletClient, cfg, account } =
          await getClients();
        const asset = getAssetBySymbol(cfg, symbol);
        if (!asset) throw new Error(`Asset ${symbol} not found`);

        const hash = await walletClient.writeContract({
          address: cfg.vault as `0x${string}`,
          abi: VAULT_ABI,
          functionName: "claimDividend",
          args: [asset.xStock],
          account,
          gas: BigInt(300000),
        });

        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getClients]
  );

  const getBalances = useCallback(
    async (symbol: string) => {
      const { publicClient, cfg: balCfg, account } = await getClients();
      const asset = getAssetBySymbol(balCfg, symbol);
      if (!asset) throw new Error(`Asset ${symbol} not found`);

      const [xStockBal, pxBal, dxBal] = await Promise.all([
        publicClient.readContract({
          address: asset.xStock as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: asset.pxToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: asset.dxToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account],
        }) as Promise<bigint>,
      ]);

      return {
        xStock: formatUnits(xStockBal, 18),
        px: formatUnits(pxBal, 18),
        dx: formatUnits(dxBal, 18),
      };
    },
    [getClients]
  );

  const getPendingDividend = useCallback(
    async (symbol: string) => {
      const { publicClient, cfg, account } = await getClients();
      const asset = getAssetBySymbol(cfg, symbol);
      if (!asset) throw new Error(`Asset ${symbol} not found`);

      const raw = (await publicClient.readContract({
        address: cfg.vault as `0x${string}`,
        abi: VAULT_ABI,
        functionName: "pendingDividend",
        args: [asset.xStock, account],
      })) as bigint;

      return formatUnits(raw, 18);
    },
    [getClients]
  );

  return {
    deposit,
    withdraw,
    claimDividend,
    getBalances,
    getPendingDividend,
    isLoading,
    error,
    txHash,
  };
}
