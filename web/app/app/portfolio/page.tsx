"use client";

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

const tokenBalances = [
  {
    symbol: "xSPY",
    name: "Wrapped SPY ETF",
    balance: "250.00",
    value: "$12,420.00",
    change: "+2.4%",
    positive: true,
  },
  {
    symbol: "xdSPY",
    name: "Income Token",
    balance: "625.00",
    value: "$800.00",
    change: "+0.8%",
    positive: true,
  },
  {
    symbol: "xpSPY",
    name: "Price Token",
    balance: "625.00",
    value: "$32,812.50",
    change: "-1.2%",
    positive: false,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: "5,000.00",
    value: "$5,000.00",
    change: "0.0%",
    positive: true,
  },
];

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

const dividendHistory = [
  { date: "Mar 15, 2026", amount: "$14.63", shares: "625 xdSPY" },
  { date: "Feb 15, 2026", amount: "$13.98", shares: "625 xdSPY" },
  { date: "Jan 15, 2026", amount: "$14.12", shares: "600 xdSPY" },
  { date: "Dec 15, 2025", amount: "$15.20", shares: "600 xdSPY" },
  { date: "Nov 15, 2025", amount: "$13.45", shares: "500 xdSPY" },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function ExpertPortfolio() {
  const totalValue = "$51,032.50";
  const pendingDividends = "$8.22";

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
              </CardTitle>
              <span className="text-lg font-semibold tracking-tight">
                {totalValue}
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
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
                        {token.balance}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium font-mono">
                        {token.value}
                      </p>
                      <p
                        className={`text-[10px] font-medium ${token.positive ? "text-green-500" : "text-red-500"
                          }`}
                      >
                        {token.change}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
                        <th className="text-left py-2 font-medium">
                          Direction
                        </th>
                        <th className="text-right py-2 font-medium">Size</th>
                        <th className="text-right py-2 font-medium">
                          Leverage
                        </th>
                        <th className="text-right py-2 font-medium">Entry</th>
                        <th className="text-right py-2 font-medium">
                          Current
                        </th>
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
                          <td className="text-right py-2.5 font-mono">
                            {pos.size}
                          </td>
                          <td className="text-right py-2.5 font-mono">
                            {pos.leverage}
                          </td>
                          <td className="text-right py-2.5 font-mono">
                            {pos.entry}
                          </td>
                          <td className="text-right py-2.5 font-mono">
                            {pos.current}
                          </td>
                          <td
                            className={`text-right py-2.5 font-mono font-medium ${pos.positive ? "text-green-500" : "text-red-500"
                              }`}
                          >
                            <div>{pos.pnl}</div>
                            <div className="text-[10px]">
                              {pos.pnlPercent}
                            </div>
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
                    {pendingDividends}
                  </p>
                </div>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-medium">
                  <Gift className="size-4 mr-1.5" />
                  Claim {pendingDividends}
                </Button>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-3" />
                  <span>Next dividend: Apr 15, 2026</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dividend history */}
          <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm font-medium">
                  Dividend History
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-0">
                  {dividendHistory.map((div, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="opacity-30" />}
                      <div className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{div.amount}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {div.shares}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {div.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border/30 flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Total Earned (All Time)
                  </span>
                  <span className="font-medium font-mono text-primary">
                    $71.38
                  </span>
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
  const totalValue = "$51,032.50";
  const pendingDividends = "$8.22";

  const simpleBalances = [
    { label: "Income Tokens", symbol: "xdSPY", value: "$800.00", balance: "625.00" },
    { label: "Price Tokens", symbol: "xpSPY", value: "$32,812.50", balance: "625.00" },
    { label: "Investments", symbol: "xSPY", value: "$12,420.00", balance: "250.00" },
    { label: "Cash Balance", symbol: "USDC", value: "$5,000.00", balance: "5,000.00" },
  ];

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
            <p className="text-4xl font-semibold tracking-tight">{totalValue}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Simple balance list */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-0">
            {simpleBalances.map((item, i) => (
              <div key={item.symbol}>
                {i > 0 && <Separator className="opacity-30" />}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Coins className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.balance} {item.symbol}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold font-mono">{item.value}</p>
                </div>
              </div>
            ))}
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
                {pendingDividends}
              </p>
            </div>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-medium">
              <Gift className="size-4 mr-2" />
              Collect Earnings
            </Button>
            <p className="text-xs text-muted-foreground">
              Next payment expected: Apr 15, 2026
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
