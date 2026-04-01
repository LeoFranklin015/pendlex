"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Wallet,
  TrendingUp,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock 30-day price data
const priceData = Array.from({ length: 30 }, (_, i) => {
  const base = 47.2;
  const noise = Math.sin(i * 0.5) * 2 + Math.cos(i * 0.3) * 1.5;
  const trend = i * 0.08;
  return {
    day: `Mar ${i + 1}`,
    price: +(base + noise + trend).toFixed(2),
  };
});

// Mock allocation
const allocation = [
  { name: "xSPY", value: 45, color: "#c8ff00" },
  { name: "xdSPY", value: 30, color: "#a3cc00" },
  { name: "xpSPY", value: 15, color: "#7a9900" },
  { name: "USDC", value: 10, color: "#526600" },
];

// Mock recent activity
const recentActivity = [
  {
    type: "Deposit",
    asset: "xSPY",
    amount: "500.00",
    value: "$23,600",
    time: "2 hours ago",
    positive: true,
  },
  {
    type: "Claim",
    asset: "xdSPY Dividend",
    amount: "12.50",
    value: "$590",
    time: "1 day ago",
    positive: true,
  },
  {
    type: "Trade",
    asset: "xpSPY Long",
    amount: "3x",
    value: "$2,400",
    time: "2 days ago",
    positive: false,
  },
  {
    type: "Withdraw",
    asset: "USDC",
    amount: "1,000.00",
    value: "$1,000",
    time: "3 days ago",
    positive: false,
  },
  {
    type: "Deposit",
    asset: "xSPY",
    amount: "250.00",
    value: "$11,750",
    time: "5 days ago",
    positive: true,
  },
];

const stats = [
  {
    label: "Total Value Locked",
    value: "$2.4M",
    icon: Lock,
    change: "+5.2%",
    positive: true,
  },
  {
    label: "Your Position Value",
    value: "$12,450",
    icon: Wallet,
    change: "+2.8%",
    positive: true,
  },
  {
    label: "xdSPY APY",
    value: "14.2%",
    icon: TrendingUp,
    change: "+0.4%",
    positive: true,
  },
  {
    label: "Session Status",
    value: "Active",
    icon: Radio,
    change: "24/7",
    positive: true,
    isBadge: true,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div {...fadeUp} transition={{ delay: 0 }}>
        <h1 className="font-[family-name:var(--font-safira)] text-2xl md:text-3xl tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your portfolio overview and market snapshot.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            {...fadeUp}
            transition={{ delay: 0.05 * (i + 1) }}
          >
            <Card className="hover:border-[#c8ff00]/20 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
                <span className="text-xs text-muted-foreground font-medium">
                  {stat.label}
                </span>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="text-xl font-semibold tracking-tight">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.isBadge ? (
                    <Badge className="bg-[#c8ff00]/10 text-[#c8ff00] border-0 text-[10px]">
                      {stat.change}
                    </Badge>
                  ) : (
                    <span
                      className={`text-xs font-medium ${
                        stat.positive ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Price chart */}
        <motion.div
          className="lg:col-span-2"
          {...fadeUp}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  xSPY Price (30D)
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono"
                >
                  $49.84
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4 pt-0">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceData}>
                    <defs>
                      <linearGradient
                        id="limeGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#c8ff00"
                          stopOpacity={0.3}
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
                      tick={{ fill: "#888", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: "#888", fontSize: 11 }}
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
                      fill="url(#limeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Allocation pie */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-medium">
                Portfolio Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 flex flex-col items-center">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {allocation.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 w-full">
                {allocation.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="text-xs font-medium ml-auto">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-0">
              {recentActivity.map((tx, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="opacity-30" />}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          tx.positive
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {tx.positive ? (
                          <ArrowUpRight className="size-4" />
                        ) : (
                          <ArrowDownRight className="size-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.asset}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{tx.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
