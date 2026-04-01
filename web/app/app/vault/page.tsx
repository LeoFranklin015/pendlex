"use client";

import { useState } from "react";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Gift,
  Lock,
  CalendarClock,
  Info,
} from "lucide-react";

const vaultStats = {
  tvl: "$2,420,000",
  totalXdSpy: "18,450 xdSPY",
  totalXpSpy: "18,450 xpSPY",
  rewardPerShare: "0.0234 USDC",
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function DepositTab() {
  const [amount, setAmount] = useState("");
  const numAmount = parseFloat(amount) || 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
          xSPY Amount
        </label>
        <div className="relative">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-16 h-12 text-lg"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
            xSPY
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Balance: 1,250.00 xSPY
        </p>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <p className="text-xs text-muted-foreground font-medium mb-2">
          You will receive:
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[#c8ff00]/20 flex items-center justify-center">
              <Coins className="size-3 text-[#c8ff00]" />
            </div>
            <span className="text-sm">xdSPY (Income)</span>
          </div>
          <span className="text-sm font-medium font-mono">
            {numAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[#c8ff00]/20 flex items-center justify-center">
              <Coins className="size-3 text-[#c8ff00]" />
            </div>
            <span className="text-sm">xpSPY (Price)</span>
          </div>
          <span className="text-sm font-medium font-mono">
            {numAmount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        <p>
          Depositing xSPY splits it 1:1 into xdSPY (income token) and xpSPY
          (price exposure token). You can trade them independently or recombine
          later.
        </p>
      </div>

      <Button
        className="w-full h-10 bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80 font-medium"
        disabled={numAmount <= 0}
      >
        <ArrowDownToLine className="size-4 mr-2" />
        Deposit xSPY
      </Button>
    </div>
  );
}

function WithdrawTab() {
  const [xdAmount, setXdAmount] = useState("");
  const [xpAmount, setXpAmount] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Your Balances
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm">xdSPY</span>
          <span className="text-sm font-medium font-mono">625.00</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">xpSPY</span>
          <span className="text-sm font-medium font-mono">625.00</span>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
          xdSPY Amount
        </label>
        <Input
          type="number"
          placeholder="0.00"
          value={xdAmount}
          onChange={(e) => {
            setXdAmount(e.target.value);
            setXpAmount(e.target.value);
          }}
          className="h-10"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
          xpSPY Amount
        </label>
        <Input
          type="number"
          placeholder="0.00"
          value={xpAmount}
          onChange={(e) => {
            setXpAmount(e.target.value);
            setXdAmount(e.target.value);
          }}
          className="h-10"
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        <p>
          You must provide equal amounts of xdSPY and xpSPY to recombine back
          into xSPY.
        </p>
      </div>

      <Button
        className="w-full h-10 bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80 font-medium"
        disabled={!xdAmount || parseFloat(xdAmount) <= 0}
      >
        <ArrowUpFromLine className="size-4 mr-2" />
        Recombine to xSPY
      </Button>
    </div>
  );
}

export default function VaultPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <motion.div {...fadeUp}>
        <h1 className="font-[family-name:var(--font-safira)] text-2xl md:text-3xl tracking-tight">
          Vault
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deposit xSPY to mint income and price exposure tokens.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main deposit/withdraw */}
        <motion.div
          className="lg:col-span-2"
          {...fadeUp}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="deposit">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="deposit" className="flex-1">
                    <ArrowDownToLine className="size-3.5 mr-1.5" />
                    Deposit
                  </TabsTrigger>
                  <TabsTrigger value="withdraw" className="flex-1">
                    <ArrowUpFromLine className="size-3.5 mr-1.5" />
                    Withdraw
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="deposit">
                  <DepositTab />
                </TabsContent>
                <TabsContent value="withdraw">
                  <WithdrawTab />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar stats */}
        <div className="space-y-4">
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lock className="size-4 text-muted-foreground" />
                  Vault Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">TVL</span>
                  <span className="text-sm font-medium font-mono">
                    {vaultStats.tvl}
                  </span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Total xdSPY Minted
                  </span>
                  <span className="text-sm font-medium font-mono">
                    {vaultStats.totalXdSpy}
                  </span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Total xpSPY Minted
                  </span>
                  <span className="text-sm font-medium font-mono">
                    {vaultStats.totalXpSpy}
                  </span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Reward / Share
                  </span>
                  <span className="text-sm font-medium font-mono">
                    {vaultStats.rewardPerShare}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <Card className="border-[#c8ff00]/20">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gift className="size-4 text-[#c8ff00]" />
                  Dividends
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="size-3" />
                    Next Dividend
                  </span>
                  <span className="text-sm font-medium">Apr 15, 2026</span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Estimated Amount
                  </span>
                  <span className="text-sm font-medium font-mono text-[#c8ff00]">
                    $14.63
                  </span>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Pending (Claimable)
                  </span>
                  <span className="text-sm font-medium font-mono text-[#c8ff00]">
                    $8.22
                  </span>
                </div>
                <Button
                  className="w-full mt-1 bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80 font-medium"
                  size="sm"
                >
                  <Gift className="size-3.5 mr-1.5" />
                  Claim $8.22
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
