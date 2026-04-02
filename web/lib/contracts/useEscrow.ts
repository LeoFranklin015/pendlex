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
import { getContractConfig } from "./addresses";
import { ESCROW_ABI, ERC20_ABI } from "./abis";

function getChainFromWallet(wallet: { chainId: string }) {
  const raw = wallet.chainId;
  const chainId = parseInt(raw.includes(":") ? raw.split(":")[1] : raw);
  return { chain: chainId === 763373 ? inkSepolia : sepolia, chainId };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export interface OnChainListing {
  listingId: number;
  seller: string;
  dxToken: string;
  xStock: string;
  amount: string; // formatted 18 decimals
  basePrice: string; // formatted 6 decimals (USDC)
  auctionEnd: number; // unix seconds
  leaseDuration: number; // seconds
  leaseStart: number;
  leaseEnd: number;
  activeLessee: string;
  highestBidder: string;
  highestBid: string; // formatted 6 decimals (USDC)
  status: number; // 0=None, 1=OpenAuction, 2=ActiveLease, 3=Expired, 4=Cancelled, 5=ClaimedBack
}

export function useEscrow() {
  const { wallets } = useWallets();
  const { isMock } = useContractMode();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClients = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");

    const { chain, chainId } = getChainFromWallet(wallet);
    const cfg = getContractConfig(chainId, isMock);
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

  const openAuction = useCallback(
    async (
      dxTokenAddress: string,
      amount: string, // human-readable token amount (18 dec)
      basePrice: string, // human-readable USDC (6 dec)
      auctionDurationSecs: number,
      leaseDurationSecs: number
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const { publicClient, walletClient, cfg, account } =
          await getClients();
        const escrowAddress = cfg.escrow as `0x${string}`;
        const rawAmount = parseUnits(amount, 18);
        const rawBasePrice = parseUnits(basePrice, 6);

        // Approve dxToken for escrow
        await ensureApproval(
          publicClient,
          walletClient,
          dxTokenAddress as `0x${string}`,
          escrowAddress,
          rawAmount,
          account
        );

        const hash = await walletClient.writeContract({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: "openAuction",
          args: [
            dxTokenAddress,
            rawAmount,
            rawBasePrice,
            BigInt(auctionDurationSecs),
            BigInt(leaseDurationSecs),
          ],
          account,
          gas: BigInt(500000),
        });

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

  const placeBid = useCallback(
    async (listingId: number, amount: string /* human-readable USDC */) => {
      setIsLoading(true);
      setError(null);
      try {
        const { publicClient, walletClient, cfg, account } =
          await getClients();
        const escrowAddress = cfg.escrow as `0x${string}`;
        const usdcAddress = cfg.usdc as `0x${string}`;
        const rawAmount = parseUnits(amount, 6);

        // Approve USDC for escrow
        await ensureApproval(
          publicClient,
          walletClient,
          usdcAddress,
          escrowAddress,
          rawAmount,
          account
        );

        const hash = await walletClient.writeContract({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: "placeBid",
          args: [BigInt(listingId), rawAmount],
          account,
          gas: BigInt(300000),
        });

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

  const finalizeAuction = useCallback(
    async (listingId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const { publicClient, walletClient, cfg, account } =
          await getClients();
        const hash = await walletClient.writeContract({
          address: cfg.escrow as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: "finalizeAuction",
          args: [BigInt(listingId)],
          account,
          gas: BigInt(300000),
        });
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

  const cancelAuction = useCallback(
    async (listingId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const { publicClient, walletClient, cfg, account } =
          await getClients();
        const hash = await walletClient.writeContract({
          address: cfg.escrow as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: "cancelAuction",
          args: [BigInt(listingId)],
          account,
          gas: BigInt(300000),
        });
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

  // Fetch all listings from 1..nextListingId-1
  const fetchListings = useCallback(async (): Promise<OnChainListing[]> => {
    const { publicClient, cfg } = await getClients();
    const escrowAddress = cfg.escrow as `0x${string}`;

    const nextId = (await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: "nextListingId",
    })) as bigint;

    const count = Number(nextId) - 1;
    if (count <= 0) return [];

    const results: OnChainListing[] = [];
    // Fetch in parallel batches
    const promises = [];
    for (let i = 1; i <= count; i++) {
      promises.push(
        publicClient.readContract({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: "getListing",
          args: [BigInt(i)],
        })
      );
    }

    const raw = await Promise.all(promises);
    for (let i = 0; i < raw.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = raw[i] as any;
      results.push({
        listingId: i + 1,
        seller: r.seller,
        dxToken: r.dxToken,
        xStock: r.xStock,
        amount: formatUnits(r.amount, 18),
        basePrice: formatUnits(r.basePrice, 6),
        auctionEnd: Number(r.auctionEnd),
        leaseDuration: Number(r.leaseDuration),
        leaseStart: Number(r.leaseStart),
        leaseEnd: Number(r.leaseEnd),
        activeLessee: r.activeLessee,
        highestBidder: r.highestBidder,
        highestBid: formatUnits(r.highestBid, 6),
        status: Number(r.status),
      });
    }

    return results;
  }, [getClients]);

  // Fetch bid history from BidPlaced event logs for a listing
  const fetchBids = useCallback(
    async (listingId: number): Promise<{ bidder: string; amount: string; blockNumber: bigint }[]> => {
      const { publicClient, cfg } = await getClients();
      const escrowAddress = cfg.escrow as `0x${string}`;

      const logs = await publicClient.getLogs({
        address: escrowAddress,
        event: {
          type: "event",
          name: "BidPlaced",
          inputs: [
            { name: "listingId", type: "uint256", indexed: true },
            { name: "bidder", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
          ],
        },
        args: {
          listingId: BigInt(listingId),
        },
        fromBlock: BigInt(0),
        toBlock: "latest",
      });

      return logs.map((log) => ({
        bidder: (log.args as { bidder: string }).bidder,
        amount: formatUnits((log.args as { amount: bigint }).amount, 6),
        blockNumber: log.blockNumber,
      }));
    },
    [getClients]
  );

  const getMinBidIncrement = useCallback(async (): Promise<string> => {
    const { publicClient, cfg } = await getClients();
    const raw = (await publicClient.readContract({
      address: cfg.escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: "minBidIncrement",
    })) as bigint;
    return formatUnits(raw, 6);
  }, [getClients]);

  return {
    openAuction,
    placeBid,
    finalizeAuction,
    cancelAuction,
    fetchListings,
    fetchBids,
    getMinBidIncrement,
    isLoading,
    error,
  };
}
