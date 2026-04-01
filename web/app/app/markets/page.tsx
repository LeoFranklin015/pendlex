"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  Zap,
  Circle,
  ArrowUpDown,
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

// Sawtooth mock data for xdSPY (resets on ex-dividend)
const xdSpyData = Array.from({ length: 60 }, (_, i) => {
  const cycle = i % 15;
  const base = 1.0;
  const growth = cycle * 0.02;
  const drop = cycle === 14 ? 0.25 : 0;
  return {
    day: `Day ${i + 1}`,
    price: +(base + growth - drop).toFixed(3),
  };
});

// Intraday mock data for xpSPY
const xpSpyData = Array.from({ length: 78 }, (_, i) => {
  const base = 52.0;
  const noise =
    Math.sin(i * 0.2) * 1.5 +
    Math.cos(i * 0.13) * 0.8 +
    Math.sin(i * 0.07) * 2;
  return {
    time: `${9 + Math.floor((i * 5) / 60)}:${String((i * 5) % 60).padStart(2, "0")}`,
    price: +(base + noise).toFixed(2),
  };
});

// Mock open positions
const openPositions = [
  {
    id: 1,
    direction: "Long",
    size: "$5,000",
    leverage: "3x",
    entry: "$51.20",
    current: "$52.40",
    pnl: "+$176.40",
    pnlPercent: "+3.4%",
    positive: true,
    health: 82,
  },
  {
    id: 2,
    direction: "Short",
    size: "$2,500",
    leverage: "2x",
    entry: "$53.10",
    current: "$52.40",
    pnl: "+$66.00",
    pnlPercent: "+2.6%",
    positive: true,
    health: 91,
  },
  {
    id: 3,
    direction: "Long",
    size: "$1,200",
    leverage: "5x",
    entry: "$52.80",
    current: "$52.40",
    pnl: "-$120.00",
    pnlPercent: "-2.0%",
    positive: false,
    health: 64,
  },
];

const circuitBreakers = [
  { level: 1, threshold: "7%", status: "Inactive" },
  { level: 2, threshold: "13%", status: "Inactive" },
  { level: 3, threshold: "20%", status: "Inactive" },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function SessionBanner() {
  const [countdown, setCountdown] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const utcH = now.getUTCHours();
      const utcM = now.getUTCMinutes();
      const utcS = now.getUTCSeconds();
      const day = now.getUTCDay();
      const nowMins = utcH * 60 + utcM;
      const isWeekday = day >= 1 && day <= 5;
      const open = isWeekday && nowMins >= 810 && nowMins < 1200;
      setIsOpen(open);

      let targetMins: number;
      if (open) {
        targetMins = 1200; // close at 20:00 UTC
      } else if (isWeekday && nowMins < 810) {
        targetMins = 810; // open at 13:30 UTC
      } else {
        // after close or weekend -- next open
        targetMins = 810 + 24 * 60; // tomorrow
      }

      const diffSecs =
        (targetMins - nowMins) * 60 - utcS + (open ? 0 : 0);
      const absDiff = Math.max(0, open ? (1200 - nowMins) * 60 - utcS : diffSecs);
      const h = Math.floor(absDiff / 3600);
      const m = Math.floor((absDiff % 3600) / 60);
      const s = absDiff % 60;
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`rounded-lg p-3 flex items-center justify-between ${
        isOpen
          ? "bg-green-500/10 border border-green-500/20"
          : "bg-red-500/10 border border-red-500/20"
      }`}
    >
      <div className="flex items-center gap-2">
        <Circle
          className={`size-2 fill-current ${
            isOpen ? "text-green-500" : "text-red-500"
          }`}
        />
        <span
          className={`text-sm font-medium ${
            isOpen ? "text-green-500" : "text-red-500"
          }`}
        >
          {isOpen ? "NYSE SESSION OPEN" : "NYSE SESSION CLOSED"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3" />
        <span className="font-mono">
          {isOpen ? "Closes in " : "Opens in "}
          {countdown}
        </span>
      </div>
    </div>
  );
}

function XdSpyMarket() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  xdSPY Price
                </CardTitle>
                <Badge className="bg-[#c8ff00]/10 text-[#c8ff00] border-0 text-[10px]">
                  24/7 Trading
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4 pt-0">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={xdSpyData}>
                    <defs>
                      <linearGradient
                        id="xdGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#c8ff00"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#c8ff00"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
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
                      domain={["dataMin - 0.05", "dataMax + 0.05"]}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="price"
                      stroke="#c8ff00"
                      strokeWidth={2}
                      fill="url(#xdGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order form + stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-medium">Trade xdSPY</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={`flex-1 ${
                    side === "buy"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => setSide("buy")}
                >
                  Buy
                </Button>
                <Button
                  size="sm"
                  className={`flex-1 ${
                    side === "sell"
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => setSide("sell")}
                >
                  Sell
                </Button>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Amount
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Price</span>
                <span className="font-mono">$1.28 / xdSPY</span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono">
                  ${((parseFloat(amount) || 0) * 1.28).toFixed(2)}
                </span>
              </div>

              <Button
                className={`w-full h-9 font-medium ${
                  side === "buy"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {side === "buy" ? "Buy" : "Sell"} xdSPY
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-medium">
                Market Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2.5">
              {[
                { label: "Price", value: "$1.28" },
                { label: "24h Volume", value: "$284,500" },
                {
                  label: "24h Change",
                  value: "+1.2%",
                  color: "text-green-500",
                },
                { label: "Market Cap", value: "$23.6M" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span
                    className={`text-sm font-medium font-mono ${item.color || ""}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function XpSpyMarket() {
  const [collateral, setCollateral] = useState("");
  const [leverage, setLeverage] = useState(2);
  const [direction, setDirection] = useState<"long" | "short">("long");
  const collateralNum = parseFloat(collateral) || 0;
  const positionSize = collateralNum * leverage;

  return (
    <div className="space-y-4">
      <SessionBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  xpSPY Intraday
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  $52.40
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4 pt-0">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={xpSpyData}>
                    <defs>
                      <linearGradient
                        id="xpGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#c8ff00"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#c8ff00"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#888", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={12}
                    />
                    <YAxis
                      tick={{ fill: "#888", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      domain={["dataMin - 1", "dataMax + 1"]}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#c8ff00"
                      strokeWidth={2}
                      fill="url(#xpGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Open positions */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-medium">
                Open Positions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border/50">
                      <th className="text-left py-2 font-medium">Direction</th>
                      <th className="text-right py-2 font-medium">Size</th>
                      <th className="text-right py-2 font-medium">Leverage</th>
                      <th className="text-right py-2 font-medium">Entry</th>
                      <th className="text-right py-2 font-medium">P&L</th>
                      <th className="text-right py-2 font-medium">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((pos) => (
                      <tr
                        key={pos.id}
                        className="border-b border-border/30 last:border-0"
                      >
                        <td className="py-2.5">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              pos.direction === "Long"
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
                        <td
                          className={`text-right py-2.5 font-mono font-medium ${
                            pos.positive ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {pos.pnl}
                        </td>
                        <td className="text-right py-2.5">
                          <span
                            className={`text-xs font-mono ${
                              pos.health > 75
                                ? "text-green-500"
                                : pos.health > 50
                                  ? "text-yellow-500"
                                  : "text-red-500"
                            }`}
                          >
                            {pos.health}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Circuit breakers */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                Circuit Breakers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-3 gap-3">
                {circuitBreakers.map((cb) => (
                  <div
                    key={cb.level}
                    className="rounded-lg bg-muted/30 p-3 text-center"
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      Level {cb.level}
                    </p>
                    <p className="text-sm font-medium font-mono">
                      {cb.threshold}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <Circle className="size-1.5 fill-green-500 text-green-500" />
                      <span className="text-[10px] text-green-500">
                        {cb.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trading form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="size-4 text-[#c8ff00]" />
                Leverage Trade
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              {/* Direction */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={`flex-1 ${
                    direction === "long"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => setDirection("long")}
                >
                  <TrendingUp className="size-3.5 mr-1" />
                  Long
                </Button>
                <Button
                  size="sm"
                  className={`flex-1 ${
                    direction === "short"
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => setDirection("short")}
                >
                  <TrendingDown className="size-3.5 mr-1" />
                  Short
                </Button>
              </div>

              {/* Collateral */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Collateral (USDC)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={collateral}
                  onChange={(e) => setCollateral(e.target.value)}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Balance: 5,000.00 USDC
                </p>
              </div>

              {/* Leverage slider */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground">
                    Leverage
                  </label>
                  <span className="text-xs font-medium font-mono text-[#c8ff00]">
                    {leverage}x
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={5}
                  step={0.5}
                  value={leverage}
                  onChange={(e) => setLeverage(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-[#c8ff00]"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>2x</span>
                  <span>3x</span>
                  <span>4x</span>
                  <span>5x</span>
                </div>
              </div>

              <Separator className="opacity-30" />

              {/* Position details */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Position Size</span>
                  <span className="font-mono font-medium">
                    ${positionSize.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Entry Price</span>
                  <span className="font-mono">$52.40</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Liq. Price</span>
                  <span className="font-mono text-red-500">
                    $
                    {direction === "long"
                      ? (52.4 * (1 - 0.9 / leverage)).toFixed(2)
                      : (52.4 * (1 + 0.9 / leverage)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Health factor */}
              <div>
                <Progress value={85}>
                  <ProgressLabel className="text-xs">
                    Health Factor
                  </ProgressLabel>
                  <ProgressValue />
                </Progress>
              </div>

              <Button
                className={`w-full h-10 font-medium ${
                  direction === "long"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
                disabled={collateralNum <= 0}
              >
                <ArrowUpDown className="size-4 mr-1.5" />
                Open {direction === "long" ? "Long" : "Short"} Position
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div {...fadeUp}>
        <h1 className="font-[family-name:var(--font-safira)] text-2xl md:text-3xl tracking-tight">
          Markets
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Trade income and leveraged price exposure tokens.
        </p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <Tabs defaultValue="xdspy">
          <TabsList className="mb-4">
            <TabsTrigger value="xdspy">xdSPY Income Market</TabsTrigger>
            <TabsTrigger value="xpspy">xpSPY Leveraged Market</TabsTrigger>
          </TabsList>
          <TabsContent value="xdspy">
            <XdSpyMarket />
          </TabsContent>
          <TabsContent value="xpspy">
            <XpSpyMarket />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
