"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Settings,
  Info,
  MoreHorizontal,
  X,
  Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CandlestickChart from "@/components/candlestick-chart";
import { type Asset } from "@/lib/market-data";
import { usePythPrices } from "@/lib/use-pyth-prices";
import { usePythCandles } from "@/lib/use-pyth-candles";
import { useAppMode } from "@/lib/mode-context";
import { useExchange } from "@/lib/contracts/use-exchange";
import { useMarketStatus } from "@/lib/contracts/use-market-status";
import { usePositions, type PositionWithPnl } from "@/lib/contracts/use-positions";
import { useTxFlow } from "@/lib/contracts/use-tx-flow";
import { useErc20Balance } from "@/lib/contracts/use-erc20";
import { useContractMode } from "@/lib/contract-mode-context";
import { getPublicClient } from "@/lib/contracts/client";

// ---- Helpers ----

function LogoIcon({ asset, size = "sm" }: { asset: Asset; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "size-14" : size === "md" ? "size-10" : "size-8";
  if (asset.logo) {
    return (
      <img
        src={asset.logo}
        alt={asset.ticker}
        className={`${dim} rounded-lg shrink-0 object-cover`}
      />
    );
  }
  const letter = asset.symbol.slice(0, 2);
  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
      style={{ backgroundColor: asset.color }}
    >
      {letter}
    </div>
  );
}

// ---- Leverage presets ----

const LEVERAGE_PRESETS = [0.1, 1, 2, 5, 10, 25, 50, 100];

// ---- Right Panel: Order Form ----

function OrderForm({
  asset,
  stopLoss,
  onStopLossChange,
  marketOpen,
  onPositionOpened,
}: {
  asset: Asset;
  stopLoss: number | null;
  onStopLossChange: (v: number | null) => void;
  marketOpen: boolean;
  onPositionOpened?: () => void;
}) {
  const [tab, setTab] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [payAmount, setPayAmount] = useState("");
  const [leverage, setLeverage] = useState(25);
  const [stopLossEnabled, setStopLossEnabled] = useState(false);

  const exchange = useExchange();
  const { state: txState, error: txError, execute } = useTxFlow();

  // USDC balance
  const { balance: usdcBalance, refresh: refreshBalance } = useErc20Balance(
    exchange.cfg?.usdc as `0x${string}` | undefined,
    exchange.account ?? undefined,
    exchange.publicClient ?? null,
    6,
  );

  // Refresh balance on mount and after success
  useEffect(() => { refreshBalance(); }, [refreshBalance]);
  useEffect(() => { if (txState === "success") refreshBalance(); }, [txState, refreshBalance]);

  const payNum = parseFloat(payAmount) || 0;
  const positionSize = payNum * leverage;
  const positive = asset.change >= 0;

  const handleSubmit = async () => {
    if (payNum <= 0 || !exchange.connected) return;
    await execute(async () => {
      const result = tab === "long"
        ? await exchange.openLong(asset.ticker, payNum, leverage)
        : await exchange.openShort(asset.ticker, payNum, leverage);
      if (onPositionOpened) onPositionOpened();
      return { transactionHash: result.receipt.transactionHash };
    });
  };

  const buttonLabel = (() => {
    switch (txState) {
      case "approving": return "Approving...";
      case "pending": return "Confirming...";
      case "success": return "Done!";
      case "error": return "Try Again";
      default:
        if (!exchange.connected) return "Connect Wallet";
        if (!marketOpen) return "Market Closed";
        return `${tab === "long" ? "Long" : "Short"} ${asset.symbol}/USD`;
    }
  })();

  const disabled = payNum <= 0 || !exchange.connected || !marketOpen || txState === "pending" || txState === "approving";

  const handleStopLossToggle = () => {
    if (stopLossEnabled) {
      setStopLossEnabled(false);
      onStopLossChange(null);
    } else {
      setStopLossEnabled(true);
      const defaultSL =
        tab === "long" ? asset.price * 0.95 : asset.price * 1.05;
      onStopLossChange(Math.round(defaultSL * 100) / 100);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Long / Short tabs */}
      <div className="flex items-center border-b border-border/50">
        <button
          onClick={() => setTab("long")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            tab === "long"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="size-3.5" />
          Long
        </button>
        <button
          onClick={() => setTab("short")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            tab === "short"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingDown className="size-3.5" />
          Short
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Order type */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
            <button
              onClick={() => setOrderType("market")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                orderType === "market"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType("limit")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                orderType === "limit"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Limit
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30">
              <MoreHorizontal className="size-4" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30">
              <Info className="size-4" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30">
              <Settings className="size-4" />
            </button>
          </div>
        </div>

        {/* Pay input */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Pay</label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.0"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="h-12 text-lg pr-24 bg-muted/20 border-border/50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground px-1 py-0.5 rounded bg-muted/50">
                USD
              </span>
              <span className="text-sm font-medium">USDC</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Balance: {parseFloat(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
          </p>
        </div>

        {/* Position size */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            {tab === "long" ? "Long" : "Short"}
          </label>
          <div className="relative">
            <div className="h-12 flex items-center px-3 rounded-lg bg-muted/20 border border-border/50">
              <span className="text-lg text-foreground">
                {positionSize > 0 ? positionSize.toFixed(2) : "0.0"}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <LogoIcon asset={asset} />
                <span className="text-sm font-medium">
                  {asset.symbol.slice(0, 4)}...
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            ${positionSize.toFixed(2)} | Leverage: {leverage.toFixed(1)}x
          </p>
        </div>

        <Separator className="opacity-30" />

        {/* Leverage slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Leverage</label>
            <div className="flex items-center gap-1 bg-muted/30 rounded-md px-2 py-1">
              <input
                type="number"
                value={leverage}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v >= 0.1 && v <= 100) setLeverage(v);
                }}
                className="w-10 text-right text-sm font-medium bg-transparent outline-none text-foreground"
              />
              <span className="text-sm font-medium text-foreground">x</span>
            </div>
          </div>

          <input
            type="range"
            min={0.1}
            max={100}
            step={0.1}
            value={leverage}
            onChange={(e) => setLeverage(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
          />

          <div className="flex gap-1.5">
            {LEVERAGE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setLeverage(p)}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  leverage === p
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}X
              </button>
            ))}
          </div>
        </div>

        <Separator className="opacity-30" />

        {/* Stop Loss toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Stop Loss</label>
            <button
              onClick={handleStopLossToggle}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                stopLossEnabled ? "bg-red-500" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform ${
                  stopLossEnabled ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>
          {stopLossEnabled && stopLoss !== null && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="text-xs text-red-500">SL</span>
                <span className="text-sm font-medium text-foreground font-mono">
                  ${stopLoss.toFixed(2)}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Drag on chart to adjust
                </span>
              </div>
              <button
                onClick={() => {
                  setStopLossEnabled(false);
                  onStopLossChange(null);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Pool info */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Pool</label>
          <div className="flex items-center gap-2 bg-muted/20 border border-border/50 rounded-lg px-3 py-2.5">
            <LogoIcon asset={asset} />
            <span className="text-sm font-medium">
              {asset.symbol}-USDC
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entry Price</span>
            <span className="font-medium">
              ${asset.price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Liq. Price</span>
            <span className="font-medium text-red-500">
              $
              {tab === "long"
                ? (asset.price * (1 - 0.9 / leverage)).toFixed(2)
                : (asset.price * (1 + 0.9 / leverage)).toFixed(2)}
            </span>
          </div>
          {stopLoss !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stop Loss</span>
              <span className="font-medium text-red-500">
                ${stopLoss.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fees</span>
            <span className="font-medium">0.05%</span>
          </div>
        </div>

        {/* Place order button */}
        <Button
          className={`w-full h-11 font-medium text-sm ${
            tab === "long"
              ? "bg-primary text-primary-foreground hover:bg-primary/80"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
          disabled={disabled}
          onClick={handleSubmit}
        >
          {buttonLabel}
        </Button>
        {txState === "error" && txError && (
          <p className="text-xs text-red-500 mt-2 text-center">{txError}</p>
        )}
        {txState === "success" && (
          <p className="text-xs text-green-500 mt-2 text-center">Position opened successfully!</p>
        )}
      </div>
    </div>
  );
}

// ---- Position Row ----

function PositionRow({
  position,
  currentPrice,
  onClose,
}: {
  position: PositionWithPnl;
  currentPrice: number;
  onClose: () => Promise<void>;
}) {
  const [closing, setClosing] = useState(false);
  const pnlNum = parseFloat(position.pnl);
  const pnlPositive = pnlNum >= 0;

  const handleClose = async () => {
    setClosing(true);
    try {
      await onClose();
    } catch {
      // handled elsewhere
    } finally {
      setClosing(false);
    }
  };

  return (
    <tr className="border-b border-border/30 hover:bg-muted/20">
      <td className="py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            position.isLong ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"
          }`}>
            {position.isLong ? "LONG" : "SHORT"}
          </span>
          <span className="font-medium">{position.ticker}</span>
        </div>
      </td>
      <td className="text-right py-2.5 font-mono">
        ${parseFloat(position.notional).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="text-right py-2.5">{position.leverage}x</td>
      <td className="text-right py-2.5 font-mono">${parseFloat(position.entryPrice).toFixed(2)}</td>
      <td className="text-right py-2.5 font-mono">${currentPrice.toFixed(2)}</td>
      <td className={`text-right py-2.5 font-mono font-medium ${pnlPositive ? "text-primary" : "text-red-500"}`}>
        {pnlPositive ? "+" : ""}${pnlNum.toFixed(2)}
      </td>
      <td className="text-right py-2.5">
        <button
          onClick={handleClose}
          disabled={closing}
          className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
        >
          {closing ? "Closing..." : "Close"}
        </button>
      </td>
    </tr>
  );
}

// ---- Expert Detail ----

function ExpertDetail({ asset }: { asset: Asset }) {
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState("5m");

  const { contractMode } = useContractMode();
  const exchange = useExchange();
  const chainId = exchange.chainId ?? 763373;
  const cfg = exchange.cfg;
  const publicClient = exchange.publicClient ?? getPublicClient();

  const { isOpen: marketOpen, loading: marketLoading } = useMarketStatus(
    publicClient,
    cfg?.marketKeeper as `0x${string}` | undefined,
  );

  const {
    positions,
    loading: positionsLoading,
    removePosition,
    refreshPositions,
  } = usePositions(exchange.account ?? undefined, chainId, publicClient, cfg ?? null);

  useEffect(() => {
    refreshPositions();
    const id = setInterval(refreshPositions, 30_000);
    return () => clearInterval(id);
  }, [refreshPositions]);

  const { candles, loading: candlesLoading } = usePythCandles(
    asset.symbol,
    asset.pythFeedId,
    timeframe
  );

  const positive = asset.change >= 0;
  const timeframes = ["1m", "5m", "15m", "1h", "4h", "D", "W", "M"];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar with asset info */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-sidebar/60">
        <Link
          href="/app/markets"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <LogoIcon asset={asset} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {asset.symbol}/USD
          </span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {asset.ticker}
          </Badge>
        </div>
        <span className="text-lg font-semibold ml-2">
          ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <span
          className={`text-sm font-medium ${
            positive ? "text-primary" : "text-red-500"
          }`}
        >
          {positive ? "+" : ""}
          {asset.changePercent.toFixed(2)}%
        </span>

        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <div>
            <span className="mr-1">Conf</span>
            <span className="text-foreground">${asset.confidence.toFixed(4)}</span>
          </div>
          <div>
            <span className="mr-1">Change</span>
            <span className={positive ? "text-primary" : "text-red-500"}>
              ${Math.abs(asset.change).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="mr-1">Mark</span>
            <span className="text-foreground">${asset.price.toFixed(2)}</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {asset.type}
          </Badge>
        </div>
      </div>

      {!marketOpen && !marketLoading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-500 font-medium">
          <Circle className="size-2 fill-current" />
          Market is closed. Trading is disabled.
        </div>
      )}

      {/* Main 2-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Chart + Positions */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Timeframe bar */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-[500px] shrink-0 relative">
            {candlesLoading && candles.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <p className="text-sm text-muted-foreground">Loading chart data...</p>
              </div>
            )}
            <CandlestickChart
              data={candles}
              stopLoss={stopLoss}
              onStopLossChange={setStopLoss}
            />
          </div>

          {/* Positions table */}
          <div className="border-t border-border/50">
            <Tabs defaultValue="positions">
              <div className="flex items-center justify-between px-4">
                <TabsList className="h-10">
                  <TabsTrigger value="positions" className="text-xs">
                    Positions {positions.length}
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs">
                    Orders 0
                  </TabsTrigger>
                  <TabsTrigger value="trades" className="text-xs">
                    Trades 0
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="positions" className="px-4 pb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50">
                        <th className="text-left py-2 font-medium">Position</th>
                        <th className="text-right py-2 font-medium">Size</th>
                        <th className="text-right py-2 font-medium">Leverage</th>
                        <th className="text-right py-2 font-medium">Entry Price</th>
                        <th className="text-right py-2 font-medium">Mark Price</th>
                        <th className="text-right py-2 font-medium">PNL</th>
                        <th className="text-right py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionsLoading ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            Loading positions...
                          </td>
                        </tr>
                      ) : positions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            No open positions
                          </td>
                        </tr>
                      ) : (
                        positions.map((pos) => (
                          <PositionRow
                            key={pos.positionId}
                            position={pos}
                            currentPrice={asset.price}
                            onClose={async () => {
                              const fn = pos.isLong ? exchange.closeLong : exchange.closeShort;
                              await fn(pos.positionId, pos.ticker);
                              removePosition(pos.positionId);
                              refreshPositions();
                            }}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="orders" className="px-4 pb-4">
                <p className="text-center py-8 text-muted-foreground text-xs">
                  No open orders
                </p>
              </TabsContent>
              <TabsContent value="trades" className="px-4 pb-4">
                <p className="text-center py-8 text-muted-foreground text-xs">
                  No trade history
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right: Order form */}
        <div className="hidden md:flex w-[320px] border-l border-border/50 flex-col bg-background">
          <OrderForm
            asset={asset}
            stopLoss={stopLoss}
            onStopLossChange={setStopLoss}
            marketOpen={marketOpen}
            onPositionOpened={refreshPositions}
          />
        </div>
      </div>
    </div>
  );
}

// ---- Grandma Detail ----

function GrandmaDetail({ asset }: { asset: Asset }) {
  const positive = asset.change >= 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <Link
        href="/app/markets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Investments
      </Link>

      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <LogoIcon asset={asset} size="lg" />
          <div>
            <h1 className="font-[family-name:var(--font-safira)] text-2xl md:text-3xl tracking-tight">
              {asset.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">{asset.ticker}</p>
          </div>

          <div>
            <p className="text-4xl font-semibold tracking-tight">
              ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {positive ? (
                <TrendingUp className="size-4 text-green-500" />
              ) : (
                <TrendingDown className="size-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${positive ? "text-green-500" : "text-red-500"}`}>
                {positive ? "+" : ""}{asset.changePercent.toFixed(2)}% today
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This is a tokenized version of <strong className="text-foreground">{asset.name}</strong>.
            Deposit it in the Savings Vault to split it into income and price
            tokens and start earning regular payments.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/app/vault" className="block">
          <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/80 font-medium text-sm">
            Go to Savings Vault
          </Button>
        </Link>
        <Link href="/app/markets" className="block">
          <Button variant="outline" className="w-full h-12 font-medium text-sm">
            Back to Investments
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const router = useRouter();
  const liveAssets = usePythPrices();
  const asset = liveAssets.find((a) => a.ticker === ticker);
  const { mode } = useAppMode();

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Asset not found</p>
          <Button variant="outline" onClick={() => router.push("/app/markets")}>
            Back to Markets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={mode === "expert" ? "h-full" : ""}
      >
        {mode === "expert" ? <ExpertDetail asset={asset} /> : <GrandmaDetail asset={asset} />}
      </motion.div>
    </AnimatePresence>
  );
}
