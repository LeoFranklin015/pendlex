"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Gift,
  Wallet,
  CalendarClock,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { useAppMode } from "@/lib/mode-context";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useVault } from "@/lib/contracts/useVault";
import { usePythPrices } from "@/lib/use-pyth-prices";
import { xStockAssets } from "@/lib/market-data";
import {
  PROD_INK_SEPOLIA,
  PROD_ETH_SEPOLIA,
} from "@/lib/contracts/addresses";
import {
  createPublicClient,
  http,
  formatUnits,
} from "viem";
import { inkSepolia, sepolia } from "viem/chains";
import { ERC20_ABI } from "@/lib/contracts/abis";
import { getRpcUrl } from "@/lib/contracts/client";

// Mock portfolio value over time
const portfolioData = Array.from({ length: 60 }, (_, i) => {
  const base = 10000;
  const growth = i * 45;
  const noise = Math.sin(i * 0.3) * 200 + Math.cos(i * 0.15) * 150;
  return {
    day: `Day ${i + 1}`,
    value: Math.round(base + growth + noise),
  };
});

const activePositions = [
  {
    id: 1,
    asset: "xpSPY",
    direction: "Long",
    size: "$5,000",
    leverage: "3x",
    entry: "$51.20",
    current: "$52.40",
    pnl: "+$352.80",
    pnlPercent: "+7.1%",
    positive: true,
  },
  {
    id: 2,
    asset: "xpSPY",
    direction: "Short",
    size: "$2,500",
    leverage: "2x",
    entry: "$53.10",
    current: "$52.40",
    pnl: "+$66.00",
    pnlPercent: "+2.6%",
    positive: true,
  },
  {
    id: 3,
    asset: "xpSPY",
    direction: "Long",
    size: "$1,200",
    leverage: "5x",
    entry: "$52.80",
    current: "$52.40",
    pnl: "-$240.00",
    pnlPercent: "-4.0%",
    positive: false,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtBal(v: string): string {
  const n = parseFloat(v);
  if (n === 0) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

// -- Types --

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  valueUsd: number;
}

interface AssetDividend {
  symbol: string;
  pending: string; // raw token amount
  pendingUsd: number;
}

// -- Hook: fetch all balances across all assets --

function getChainId(wallet: { chainId: string }): number {
  const raw = wallet.chainId;
  return parseInt(raw.includes(":") ? raw.split(":")[1] : raw);
}

// Raw balance data fetched once from chain (no prices)
interface RawTokenBalance {
  symbol: string;
  name: string;
  balance: string;
  underlyingSymbol: string; // for price lookup
}

interface RawDividend {
  symbol: string;
  pending: string;
}

function usePortfolioData() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { getPendingDividend, claimDividend, isLoading: claimLoading } = useVault();
  const liveAssets = usePythPrices();

  const hasWallet = authenticated && wallets.length > 0;
  const chainId = hasWallet ? getChainId(wallets[0]) : 11155111;
  const assets = chainId === 763373 ? PROD_INK_SEPOLIA.assets : PROD_ETH_SEPOLIA.assets;

  // Raw on-chain data (fetched once, not on every price tick)
  const [rawBalances, setRawBalances] = useState<RawTokenBalance[]>([]);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [rawDividends, setRawDividends] = useState<RawDividend[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hasWallet) return;
    setLoading(true);
    const wallet = wallets[0];
    const chain = chainId === 763373 ? inkSepolia : sepolia;
    const client = createPublicClient({ chain, transport: http(getRpcUrl(chainId)) });
    const account = wallet.address as `0x${string}`;
    const cfg = chainId === 763373 ? PROD_INK_SEPOLIA : PROD_ETH_SEPOLIA;

    const balances: RawTokenBalance[] = [];
    const divs: RawDividend[] = [];

    // Fetch USDC balance
    try {
      const usdcBal = await client.readContract({
        address: cfg.usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account],
      }) as bigint;
      setUsdcBalance(formatUnits(usdcBal, 6));
    } catch {
      setUsdcBalance("0");
    }

    // Fetch balances for each asset
    for (const asset of assets) {
      const uiAsset = xStockAssets.find((a) => a.symbol === asset.symbol);

      try {
        const [xBal, pxBal, dxBal] = await Promise.all([
          client.readContract({ address: asset.xStock as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [account] }) as Promise<bigint>,
          client.readContract({ address: asset.pxToken as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [account] }) as Promise<bigint>,
          client.readContract({ address: asset.dxToken as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [account] }) as Promise<bigint>,
        ]);

        const xNum = parseFloat(formatUnits(xBal, 18));
        const pxNum = parseFloat(formatUnits(pxBal, 18));
        const dxNum = parseFloat(formatUnits(dxBal, 18));

        if (xNum > 0) {
          balances.push({
            symbol: `x${asset.symbol}`,
            name: uiAsset?.name ?? asset.symbol,
            balance: formatUnits(xBal, 18),
            underlyingSymbol: asset.symbol,
          });
        }
        if (dxNum > 0) {
          balances.push({
            symbol: `xd${asset.symbol}`,
            name: `${asset.symbol} Income Token`,
            balance: formatUnits(dxBal, 18),
            underlyingSymbol: asset.symbol,
          });
        }
        if (pxNum > 0) {
          balances.push({
            symbol: `xp${asset.symbol}`,
            name: `${asset.symbol} Price Token`,
            balance: formatUnits(pxBal, 18),
            underlyingSymbol: asset.symbol,
          });
        }
      } catch {
        // skip assets that fail
      }

      // Fetch pending dividend
      try {
        const pending = await getPendingDividend(asset.symbol);
        const pendingNum = parseFloat(pending);
        if (pendingNum > 0) {
          divs.push({ symbol: asset.symbol, pending });
        }
      } catch {
        // pendingDividend reverts if no position
      }
    }

    setRawBalances(balances);
    setRawDividends(divs);
    setLoading(false);
  // Intentionally exclude liveAssets -- prices are applied in render, not in fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWallet, wallets, chainId, getPendingDividend]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derive USD values from raw balances + live prices (recomputed on every price tick without refetching)
  const priceOf = (sym: string) => liveAssets.find((a) => a.symbol === sym)?.price ?? 0;

  const tokenBalances: TokenBalance[] = rawBalances.map((b) => ({
    symbol: b.symbol,
    name: b.name,
    balance: b.balance,
    valueUsd: parseFloat(b.balance) * priceOf(b.underlyingSymbol),
  }));

  const dividends: AssetDividend[] = rawDividends.map((d) => ({
    symbol: d.symbol,
    pending: d.pending,
    pendingUsd: parseFloat(d.pending) * priceOf(d.symbol),
  }));

  const totalPendingTokens = dividends.reduce((acc, d) => acc + parseFloat(d.pending), 0);
  const totalPendingUsd = dividends.reduce((acc, d) => acc + d.pendingUsd, 0);
  const totalBalanceUsd = tokenBalances.reduce((acc, t) => acc + t.valueUsd, 0) + parseFloat(usdcBalance);

  const handleClaimAll = async () => {
    setClaimError(null);
    for (const div of rawDividends) {
      try {
        await claimDividend(div.symbol);
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : String(err));
        break;
      }
    }
    refresh();
  };

  return {
    tokenBalances,
    usdcBalance,
    dividends,
    totalPendingTokens,
    totalPendingUsd,
    totalBalanceUsd,
    loading,
    claimLoading,
    claimError,
    handleClaimAll,
    refresh,
    hasWallet,
  };
}

function ExpertPortfolio() {
  const {
    tokenBalances,
    usdcBalance,
    dividends,
    totalPendingUsd,
    totalBalanceUsd,
    loading,
    claimLoading,
    claimError,
    handleClaimAll,
    hasWallet,
  } = usePortfolioData();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div {...fadeUp}>
        <h1 className="font-bold text-2xl md:text-5xl tracking-tight">
          Portfolio
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your holdings, positions, and dividend income.
        </p>
      </motion.div>

      {/* Token balances */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="size-4 text-muted-foreground" />
                Token Balances
                {loading && <Loader2 className="size-3 animate-spin" />}
              </CardTitle>
              <span className="text-lg font-semibold tracking-tight">
                {formatUsd(totalBalanceUsd)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {!hasWallet ? (
              <p className="text-sm text-muted-foreground text-center py-6">Connect wallet to view balances</p>
            ) : tokenBalances.length === 0 && parseFloat(usdcBalance) === 0 && !loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tokens found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {tokenBalances.map((token) => (
                  <motion.div
                    key={token.symbol}
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg bg-muted/30 p-3 border border-border/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Coins className="size-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{token.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {token.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-sm font-medium font-mono">
                          {fmtBal(token.balance)}
                        </p>
                      </div>
                      <p className="text-sm font-medium font-mono">
                        {formatUsd(token.valueUsd)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {parseFloat(usdcBalance) > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg bg-muted/30 p-3 border border-border/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Coins className="size-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">USDC</p>
                        <p className="text-[10px] text-muted-foreground">USD Coin</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-sm font-medium font-mono">
                          {fmtBal(usdcBalance)}
                        </p>
                      </div>
                      <p className="text-sm font-medium font-mono">
                        {formatUsd(parseFloat(usdcBalance))}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance chart + positions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chart */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Portfolio Performance (60D)
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono text-green-500"
                  >
                    +14.2%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4 pt-0">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioData}>
                      <defs>
                        <linearGradient
                          id="portfolioGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#4d7a00"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#4d7a00"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(0,0,0,0.06)"
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "#888", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        interval={9}
                      />
                      <YAxis
                        tick={{ fill: "#888", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value) => [
                          `$${Number(value).toLocaleString()}`,
                          "Value",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#4d7a00"
                        strokeWidth={2}
                        fill="url(#portfolioGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active positions */}
          <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Positions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border/50">
                        <th className="text-left py-2 font-medium">Asset</th>
                        <th className="text-left py-2 font-medium">Direction</th>
                        <th className="text-right py-2 font-medium">Size</th>
                        <th className="text-right py-2 font-medium">Leverage</th>
                        <th className="text-right py-2 font-medium">Entry</th>
                        <th className="text-right py-2 font-medium">Current</th>
                        <th className="text-right py-2 font-medium">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePositions.map((pos) => (
                        <tr
                          key={pos.id}
                          className="border-b border-border/30 last:border-0"
                        >
                          <td className="py-2.5 font-medium">{pos.asset}</td>
                          <td className="py-2.5">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${pos.direction === "Long"
                                ? "text-green-500"
                                : "text-red-500"
                                }`}
                            >
                              {pos.direction === "Long" ? (
                                <TrendingUp className="size-3 mr-1" />
                              ) : (
                                <TrendingDown className="size-3 mr-1" />
                              )}
                              {pos.direction}
                            </Badge>
                          </td>
                          <td className="text-right py-2.5 font-mono">{pos.size}</td>
                          <td className="text-right py-2.5 font-mono">{pos.leverage}</td>
                          <td className="text-right py-2.5 font-mono">{pos.entry}</td>
                          <td className="text-right py-2.5 font-mono">{pos.current}</td>
                          <td
                            className={`text-right py-2.5 font-mono font-medium ${pos.positive ? "text-green-500" : "text-red-500"}`}
                          >
                            <div>{pos.pnl}</div>
                            <div className="text-[10px]">{pos.pnlPercent}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Dividends sidebar */}
        <div className="space-y-4">
          {/* Claim dividends */}
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <Card className="border-primary/20">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gift className="size-4 text-primary" />
                  Claim Dividends
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="rounded-lg bg-primary/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Pending Dividends
                  </p>
                  <p className="text-2xl font-semibold text-primary font-mono tracking-tight">
                    {formatUsd(totalPendingUsd)}
                  </p>
                </div>

                {dividends.length > 0 && (
                  <div className="space-y-1.5">
                    {dividends.map((d) => (
                      <div key={d.symbol} className="flex items-center justify-between text-xs px-1">
                        <span className="text-muted-foreground">xd{d.symbol}</span>
                        <span className="font-mono font-medium">
                          {fmtBal(d.pending)} tokens ({formatUsd(d.pendingUsd)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {claimError && (
                  <p className="text-xs text-red-500 text-center">{claimError}</p>
                )}

                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-medium"
                  disabled={dividends.length === 0 || claimLoading || !hasWallet}
                  onClick={handleClaimAll}
                >
                  {claimLoading ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Gift className="size-4 mr-1.5" />
                  )}
                  {claimLoading
                    ? "Claiming..."
                    : dividends.length > 0
                      ? `Claim ${formatUsd(totalPendingUsd)}`
                      : "No dividends to claim"}
                </Button>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-3" />
                  <span>Dividends accrue when multiplier changes</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function GrandmaPortfolio() {
  const {
    tokenBalances,
    usdcBalance,
    dividends,
    totalPendingUsd,
    totalBalanceUsd,
    loading,
    claimLoading,
    claimError,
    handleClaimAll,
    hasWallet,
  } = usePortfolioData();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <motion.div {...fadeUp}>
        <h1 className="font-bold text-2xl md:text-3xl tracking-tight">
          Your Holdings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everything you own in one place.
        </p>
      </motion.div>

      {/* Big total value */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <Card className="border-primary/20">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Total Value</p>
            <p className="text-4xl font-semibold tracking-tight">
              {loading ? <Loader2 className="size-6 animate-spin mx-auto" /> : formatUsd(totalBalanceUsd)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Balance list */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-0">
            {!hasWallet ? (
              <p className="text-sm text-muted-foreground text-center py-6">Connect wallet to view balances</p>
            ) : tokenBalances.length === 0 && parseFloat(usdcBalance) === 0 && !loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tokens found</p>
            ) : (
              <>
                {tokenBalances.map((item, i) => (
                  <div key={item.symbol}>
                    {i > 0 && <Separator className="opacity-30" />}
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Coins className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtBal(item.balance)} tokens
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold font-mono">{formatUsd(item.valueUsd)}</p>
                    </div>
                  </div>
                ))}
                {parseFloat(usdcBalance) > 0 && (
                  <>
                    {tokenBalances.length > 0 && <Separator className="opacity-30" />}
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Coins className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">USDC</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtBal(usdcBalance)} tokens
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold font-mono">{formatUsd(parseFloat(usdcBalance))}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Earnings claim */}
      <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
        <Card className="border-primary/20">
          <CardContent className="p-6 text-center space-y-3">
            <Gift className="size-8 text-primary mx-auto" />
            <div>
              <p className="text-sm text-muted-foreground">Earnings Ready to Collect</p>
              <p className="text-3xl font-semibold text-primary font-mono tracking-tight mt-1">
                {formatUsd(totalPendingUsd)}
              </p>
            </div>

            {dividends.length > 0 && (
              <div className="space-y-1">
                {dividends.map((d) => (
                  <p key={d.symbol} className="text-xs text-muted-foreground">
                    {fmtBal(d.pending)} xd{d.symbol} ({formatUsd(d.pendingUsd)})
                  </p>
                ))}
              </div>
            )}

            {claimError && (
              <p className="text-xs text-red-500">{claimError}</p>
            )}

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-medium"
              disabled={dividends.length === 0 || claimLoading || !hasWallet}
              onClick={handleClaimAll}
            >
              {claimLoading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Gift className="size-4 mr-2" />
              )}
              {claimLoading
                ? "Claiming..."
                : dividends.length > 0
                  ? `Collect ${formatUsd(totalPendingUsd)}`
                  : "No earnings yet"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Dividends accrue when the stock multiplier changes
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function PortfolioPage() {
  const { mode } = useAppMode();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {mode === "expert" ? <ExpertPortfolio /> : <GrandmaPortfolio />}
      </motion.div>
    </AnimatePresence>
  );
}
