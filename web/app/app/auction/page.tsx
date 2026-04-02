"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Clock,
  Gavel,
  ChevronDown,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  mockAuctions,
  xdTokens,
  DIVIDEND_APY,
  type AuctionListing,
  type AuctionBid,
} from "@/lib/auction-data";

// ---- Helpers ----

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeLeft(endsAt: number) {
  const diff = endsAt - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400_000);
  const hours = Math.floor((diff % 86400_000) / 3600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600_000) / 60_000);
  return `${hours}h ${mins}m left`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function TokenLogo({
  logo,
  color,
  symbol,
  size = "md",
}: {
  logo: string;
  color: string;
  symbol: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  if (logo) {
    return (
      <img
        src={logo}
        alt={symbol}
        className={`${dim} rounded-lg shrink-0 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

// ---- List New Auction Panel ----

function ListAuctionPanel({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [quarters, setQuarters] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [showTokenMenu, setShowTokenMenu] = useState(false);

  const selectedToken = xdTokens.find((t) => t.ticker === token);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h2 className="font-[family-name:var(--font-safira)] text-lg text-foreground">
          List for Auction
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Token selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Select Token
          </label>
          <div className="relative">
            <button
              onClick={() => setShowTokenMenu(!showTokenMenu)}
              className="w-full flex items-center justify-between h-9 px-3 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              {selectedToken ? (
                <span className="flex items-center gap-2">
                  <TokenLogo
                    logo={selectedToken.logo}
                    color={selectedToken.color}
                    symbol={selectedToken.symbol}
                    size="sm"
                  />
                  <span>{selectedToken.ticker}</span>
                  <span className="text-muted-foreground text-xs">
                    {selectedToken.name}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Choose a token</span>
              )}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {showTokenMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTokenMenu(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border/50 bg-card shadow-lg py-1">
                  {xdTokens.map((t) => (
                    <button
                      key={t.ticker}
                      onClick={() => {
                        setToken(t.ticker);
                        setShowTokenMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        token === t.ticker
                          ? "text-primary bg-muted/30"
                          : "text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <TokenLogo
                        logo={t.logo}
                        color={t.color}
                        symbol={t.symbol}
                        size="sm"
                      />
                      <span>{t.ticker}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Token Amount
          </label>
          <Input
            type="number"
            placeholder="e.g. 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 bg-muted/30 border-border/50"
          />
        </div>

        {/* Quarters */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Number of Quarters
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setQuarters(String(q))}
                className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-all ${
                  quarters === String(q)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {q}Q
              </button>
            ))}
          </div>
        </div>

        {/* Starting price */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Starting Price (USDC)
          </label>
          <Input
            type="number"
            placeholder="e.g. 1000"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            className="h-9 bg-muted/30 border-border/50"
          />
        </div>

        {/* Summary */}
        {token && amount && quarters && startingPrice && (
          <div className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-2 text-xs">
            <p className="font-medium text-foreground">Summary</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Token</span>
              <span className="text-foreground">{token}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Amount</span>
              <span className="text-foreground">{amount} tokens</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Duration</span>
              <span className="text-foreground">{quarters} quarter(s)</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Min bid</span>
              <span className="text-foreground">${startingPrice} USDC</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/50">
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-medium"
          disabled={!token || !amount || !quarters || !startingPrice}
        >
          List for Auction
        </Button>
      </div>
    </div>
  );
}

// ---- Auction Detail Panel ----

function AuctionDetailPanel({
  auction,
  onClose,
}: {
  auction: AuctionListing;
  onClose: () => void;
}) {
  const [bidAmount, setBidAmount] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <TokenLogo
            logo={auction.logo}
            color={auction.color}
            symbol={auction.symbol}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-safira)] text-lg text-foreground">
                {auction.token}
              </h2>
              <Badge className="bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5">
                {(auction.dividendApy * 100).toFixed(2)}% APY
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {auction.tokenAmount} tokens / {auction.quarters}Q
              </span>
              <span className="text-xs font-bold text-[#c8ff00]">+xPoints</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Highest Bid
              </p>
              <p className="text-xl font-semibold text-primary mt-1">
                ${auction.highestBid.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">USDC</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Starting Price
              </p>
              <p className="text-xl font-semibold text-foreground mt-1">
                ${auction.startingPrice.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">USDC</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3" />
              <span>{timeLeft(auction.endsAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-3" />
              <span>{auction.bids.length} bids</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <span>Seller: </span>
            <span className="font-mono text-foreground">
              {truncAddr(auction.seller)}
            </span>
          </div>

          <Separator className="opacity-50" />

          {/* Bid form */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Place your bid (USDC)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`Min ${auction.highestBid > 0 ? auction.highestBid + 1 : auction.startingPrice}`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="h-9 bg-muted/30 border-border/50 flex-1"
              />
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/80 font-medium h-9 px-4"
                disabled={!bidAmount}
              >
                Bid
              </Button>
            </div>
            {auction.highestBid > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Must be higher than ${auction.highestBid.toLocaleString()} USDC
              </p>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Bid list */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-3">
              All Bids ({auction.bids.length})
            </h3>
            <div className="space-y-1">
              {auction.bids.map((bid, i) => (
                <BidRow key={bid.id} bid={bid} rank={i + 1} isTop={i === 0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BidRow({
  bid,
  rank,
  isTop,
}: {
  bid: AuctionBid;
  rank: number;
  isTop: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
        isTop ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-mono w-5 text-center ${
            isTop ? "text-primary" : "text-muted-foreground"
          }`}
        >
          #{rank}
        </span>
        <div>
          <p className="text-sm font-mono text-foreground">
            {truncAddr(bid.bidder)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {timeAgo(bid.timestamp)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-medium ${
            isTop ? "text-primary" : "text-foreground"
          }`}
        >
          ${bid.amount.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground">USDC</p>
      </div>
    </div>
  );
}

// ---- Auction Card ----

function AuctionCard({
  auction,
  onClick,
}: {
  auction: AuctionListing;
  onClick: () => void;
}) {
  return (
    <Card
      className="overflow-hidden hover:ring-foreground/20 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TokenLogo
            logo={auction.logo}
            color={auction.color}
            symbol={auction.symbol}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              {auction.token}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {auction.tokenAmount} tokens
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="secondary"
            className="text-[10px]"
          >
            {auction.quarters}Q
          </Badge>
          <Badge className="bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5">
            {(auction.dividendApy * 100).toFixed(2)}% APY +xPoints
          </Badge>
        </div>
      </div>

      <div className="mx-3 mb-3 rounded-lg overflow-hidden bg-muted/20 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Highest Bid
            </p>
            <p className="text-lg font-semibold text-primary">
              {auction.highestBid > 0
                ? `$${auction.highestBid.toLocaleString()}`
                : "--"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Floor
            </p>
            <p className="text-sm font-medium text-foreground">
              ${auction.startingPrice.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>{timeLeft(auction.endsAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gavel className="size-3" />
            <span>{auction.bids.length} bids</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-mono">
            {truncAddr(auction.seller)}
          </p>
          <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Card>
  );
}

// ---- Slide-over Backdrop + Panel ----

function SlidePanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-sidebar border-l border-border/50 shadow-2xl"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---- Main Page ----

export default function AuctionPage() {
  return (
    <Suspense>
      <AuctionPageInner />
    </Suspense>
  );
}

function AuctionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const isCreating = searchParams.get("new") === "1";

  const [search, setSearch] = useState("");

  const selectedAuction = useMemo(
    () => mockAuctions.find((a) => a.id === selectedId) ?? null,
    [selectedId]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return mockAuctions;
    const q = search.toLowerCase();
    return mockAuctions.filter(
      (a) =>
        a.token.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  function openListing(id: string) {
    router.push(`/app/auction?id=${id}`, { scroll: false });
  }

  function openCreate() {
    router.push("/app/auction?new=1", { scroll: false });
  }

  function closePanel() {
    router.push("/app/auction", { scroll: false });
  }

  return (
    <div className="p-4 md:p-6 pb-12 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-bold text-2xl md:text-5xl tracking-tight text-foreground">
            Auction
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bid on dividend streams from xd tokens
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/80 font-medium gap-1.5"
        >
          <Plus className="size-4" />
          List Token
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="relative w-full sm:w-64">
          <Gavel className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search auctions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border/50"
          />
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 text-xs text-muted-foreground"
      >
        <span>
          <span className="text-foreground font-medium">{filtered.length}</span>{" "}
          active auctions
        </span>
        <span>
          <span className="text-foreground font-medium">
            {filtered.reduce((acc, a) => acc + a.bids.length, 0)}
          </span>{" "}
          total bids
        </span>
      </motion.div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No auctions found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((auction, i) => (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <AuctionCard
                auction={auction}
                onClick={() => openListing(auction.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail slide panel */}
      <SlidePanel open={!!selectedAuction} onClose={closePanel}>
        {selectedAuction && (
          <AuctionDetailPanel auction={selectedAuction} onClose={closePanel} />
        )}
      </SlidePanel>

      {/* Create listing slide panel */}
      <SlidePanel open={isCreating} onClose={closePanel}>
        <ListAuctionPanel onClose={closePanel} />
      </SlidePanel>
    </div>
  );
}
