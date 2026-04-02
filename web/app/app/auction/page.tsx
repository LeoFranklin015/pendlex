"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
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
  DollarSign,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  xdTokens,
  DIVIDEND_APY,
  type AuctionListing,
  type AuctionBid,
} from "@/lib/auction-data";
import { useEscrow, type OnChainListing } from "@/lib/contracts/useEscrow";
import { xStockAssets } from "@/lib/market-data";
import {
  PROD_INK_SEPOLIA,
  PROD_ETH_SEPOLIA,
  getAssetByDxToken,
} from "@/lib/contracts/addresses";

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

function ListAuctionPanel({
  onClose,
  onSuccess,
  chainId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  chainId: number;
}) {
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [quarters, setQuarters] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [showTokenMenu, setShowTokenMenu] = useState(false);
  const clean = (v: string) => v.replace(/[^0-9.]/g, "");
  const { openAuction, isLoading, error } = useEscrow();
  const { authenticated } = usePrivy();

  const selectedToken = xdTokens.find((t) => t.ticker === token);

  // Resolve the on-chain dxToken address from the selected symbol
  const assets = chainId === 763373 ? PROD_INK_SEPOLIA.assets : PROD_ETH_SEPOLIA.assets;
  const onChainAsset = selectedToken
    ? assets.find((a) => a.symbol === selectedToken.symbol)
    : null;

  // Fetch dxToken balance
  const [dxBalance, setDxBalance] = useState<string | null>(null);
  const { wallets } = useWallets();

  useEffect(() => {
    if (!onChainAsset || !authenticated || wallets.length === 0) {
      setDxBalance(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const wallet = wallets[0];
        const provider = await wallet.getEthereumProvider();
        const { createPublicClient, http, formatUnits } = await import("viem");
        const chain = chainId === 763373
          ? (await import("viem/chains")).inkSepolia
          : (await import("viem/chains")).sepolia;
        const client = createPublicClient({ chain, transport: http() });
        const bal = await client.readContract({
          address: onChainAsset.dxToken as `0x${string}`,
          abi: [{ type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }],
          functionName: "balanceOf",
          args: [wallet.address as `0x${string}`],
        }) as bigint;
        if (!cancelled) setDxBalance(formatUnits(bal, 18));
      } catch {
        if (!cancelled) setDxBalance("0");
      }
    })();
    return () => { cancelled = true; };
  }, [onChainAsset, authenticated, wallets, chainId]);

  const QUARTER_SECS = 90 * 24 * 60 * 60; // ~90 days
  const AUCTION_DURATION = 7 * 24 * 60 * 60; // 7 day auction

  const handleList = async () => {
    if (!onChainAsset || !amount || !quarters || !startingPrice) return;
    try {
      await openAuction(
        onChainAsset.dxToken,
        amount,
        startingPrice,
        AUCTION_DURATION,
        parseInt(quarters) * QUARTER_SECS
      );
      onSuccess();
      onClose();
    } catch {
      // error set in hook
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <h2 className="font-[family-name:var(--font-safira)] text-xl text-foreground">
          List for Auction
        </h2>
        <button
          onClick={onClose}
          className="size-10 rounded-xl bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition-colors"
        >
          <X className="size-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {/* Token selector */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-5">
          <p className="text-sm text-muted-foreground font-medium mb-3">
            Select Token
          </p>
          <div className="relative">
            <button
              onClick={() => setShowTokenMenu(!showTokenMenu)}
              className="w-full flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-4 py-3 text-base font-semibold text-foreground hover:bg-muted/60 transition-colors"
            >
              {selectedToken ? (
                <span className="flex items-center gap-3">
                  <TokenLogo
                    logo={selectedToken.logo}
                    color={selectedToken.color}
                    symbol={selectedToken.symbol}
                    size="md"
                  />
                  <span>{selectedToken.ticker}</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {selectedToken.name}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground font-normal">Choose a token</span>
              )}
              <ChevronDown className="size-5 text-muted-foreground" />
            </button>
            {showTokenMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTokenMenu(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border/50 bg-card shadow-xl py-1.5 overflow-hidden">
                  {xdTokens.map((t) => (
                    <button
                      key={t.ticker}
                      onClick={() => {
                        setToken(t.ticker);
                        setShowTokenMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        token === t.ticker
                          ? "text-primary bg-primary/5"
                          : "text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <TokenLogo
                        logo={t.logo}
                        color={t.color}
                        symbol={t.symbol}
                        size="md"
                      />
                      <div>
                        <p className="text-sm font-semibold">{t.ticker}</p>
                        <p className="text-xs text-muted-foreground">{t.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-5">
          <p className="text-sm text-muted-foreground font-medium mb-3">
            Token Amount
          </p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(clean(e.target.value))}
            className="w-full bg-transparent text-4xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/25 font-mono"
          />
          {selectedToken && (
            <p className="text-sm text-muted-foreground mt-3">
              Balance: {dxBalance !== null
                ? parseFloat(dxBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                : "--"} {selectedToken.ticker}
            </p>
          )}
        </div>

        {/* Quarters */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-5">
          <p className="text-sm text-muted-foreground font-medium mb-3">
            Duration
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setQuarters(String(q))}
                className={`flex-1 h-12 rounded-xl text-base font-semibold border-2 transition-all ${
                  quarters === String(q)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {q}Q
              </button>
            ))}
          </div>
        </div>

        {/* Starting price */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-5">
          <p className="text-sm text-muted-foreground font-medium mb-3">
            Starting Price
          </p>
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={startingPrice}
              onChange={(e) => setStartingPrice(clean(e.target.value))}
              className="min-w-0 flex-1 bg-transparent text-4xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/25 font-mono"
            />
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 shrink-0">
              <DollarSign className="size-5 text-muted-foreground" />
              <span className="text-base font-semibold text-foreground">USDC</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {token && amount && quarters && startingPrice && (
          <div className="rounded-2xl bg-muted/20 border border-border/40 p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Summary</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Token</span>
              <span className="text-foreground font-medium">{token}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Amount</span>
              <span className="text-foreground font-medium">{amount} tokens</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Duration</span>
              <span className="text-foreground font-medium">{quarters} quarter(s)</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Min bid</span>
              <span className="text-foreground font-medium">${startingPrice} USDC</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-border/50 space-y-2">
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
        <Button
          className="w-full h-14 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-30 shadow-lg shadow-primary/10"
          disabled={!token || !amount || !quarters || !startingPrice || isLoading || !authenticated}
          onClick={handleList}
        >
          {isLoading ? (
            <Loader2 className="size-5 mr-2.5 animate-spin" />
          ) : (
            <Plus className="size-5 mr-2.5" />
          )}
          {isLoading ? "Listing..." : "List for Auction"}
        </Button>
      </div>
    </div>
  );
}

// ---- Auction Detail Panel ----

function AuctionDetailPanel({
  auction,
  onClose,
  onChainListing,
  onSuccess,
}: {
  auction: AuctionListing;
  onClose: () => void;
  onChainListing?: OnChainListing;
  onSuccess: () => void;
}) {
  const [bidAmount, setBidAmount] = useState("");
  const clean = (v: string) => v.replace(/[^0-9.]/g, "");
  const { placeBid, fetchBids, isLoading, error } = useEscrow();
  const { authenticated } = usePrivy();

  // Fetch real bid history from event logs
  const [liveBids, setLiveBids] = useState<AuctionBid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);

  const loadBids = useCallback(async () => {
    if (!onChainListing) return;
    setBidsLoading(true);
    try {
      const rawBids = await fetchBids(onChainListing.listingId);
      const mapped: AuctionBid[] = rawBids.map((b, i) => ({
        id: `bid-${onChainListing.listingId}-${i}`,
        bidder: b.bidder,
        amount: parseFloat(b.amount),
        timestamp: Date.now() - (rawBids.length - i) * 60000, // approximate ordering
      }));
      // Sort highest first
      mapped.sort((a, b) => b.amount - a.amount);
      setLiveBids(mapped);
    } catch (err) {
      console.error("[auction] failed to fetch bids:", err);
    } finally {
      setBidsLoading(false);
    }
  }, [onChainListing, fetchBids]);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  const displayBids = liveBids.length > 0 ? liveBids : auction.bids;

  const handleBid = async () => {
    if (!bidAmount || !onChainListing) return;
    try {
      await placeBid(onChainListing.listingId, bidAmount);
      setBidAmount("");
      onSuccess();
      loadBids(); // refresh bids after placing
    } catch {
      // error set in hook
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <TokenLogo
            logo={auction.logo}
            color={auction.color}
            symbol={auction.symbol}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-safira)] text-xl text-foreground">
                {auction.token}
              </h2>
              <Badge className="bg-foreground text-background text-xs font-semibold px-2 py-0.5">
                {(auction.dividendApy * 100).toFixed(2)}% APY
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {auction.tokenAmount} tokens / {auction.quarters}Q
              </span>
              <span className="text-xs font-bold text-[#c8ff00]">+xPoints</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="size-10 rounded-xl bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition-colors"
        >
          <X className="size-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Highest Bid
            </p>
            <p className="text-3xl font-semibold text-primary mt-1.5 font-mono tracking-tight">
              ${auction.highestBid.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">USDC</p>
          </div>
          <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Starting Price
            </p>
            <p className="text-3xl font-semibold text-foreground mt-1.5 font-mono tracking-tight">
              ${auction.startingPrice.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">USDC</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm px-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            <span>{timeLeft(auction.endsAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" />
            <span>{displayBids.length} bids</span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground px-1">
          <span>Seller: </span>
          <span className="font-mono text-foreground font-medium">
            {truncAddr(auction.seller)}
          </span>
        </div>

        {/* Bid form */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-5">
          <p className="text-sm text-muted-foreground font-medium mb-3">
            Your Bid
          </p>
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={bidAmount}
              onChange={(e) => setBidAmount(clean(e.target.value))}
              className="min-w-0 flex-1 bg-transparent text-4xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/25 font-mono"
            />
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 shrink-0">
              <DollarSign className="size-5 text-muted-foreground" />
              <span className="text-base font-semibold text-foreground">USDC</span>
            </div>
          </div>
          {auction.highestBid > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Min bid: ${(auction.highestBid + 1).toLocaleString()} USDC
            </p>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

        {/* Bid CTA */}
        <Button
          className="w-full h-14 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-30 shadow-lg shadow-primary/10"
          disabled={!bidAmount || isLoading || !authenticated || !onChainListing}
          onClick={handleBid}
        >
          {isLoading ? (
            <Loader2 className="size-5 mr-2.5 animate-spin" />
          ) : (
            <Gavel className="size-5 mr-2.5" />
          )}
          {isLoading ? "Bidding..." : "Place Bid"}
        </Button>

        {/* Bid list */}
        <div className="pt-2">
          <h3 className="text-sm font-semibold text-foreground mb-3 px-1">
            All Bids ({displayBids.length})
            {bidsLoading && <Loader2 className="inline size-3 ml-2 animate-spin" />}
          </h3>
          <div className="space-y-2">
            {displayBids.length === 0 && !bidsLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">No bids yet</p>
            )}
            {displayBids.map((bid, i) => (
              <BidRow key={bid.id} bid={bid} rank={i + 1} isTop={i === 0} />
            ))}
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
      className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
        isTop ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/20 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`size-8 rounded-lg flex items-center justify-center text-xs font-bold ${
            isTop ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"
          }`}
        >
          #{rank}
        </div>
        <div>
          <p className="text-sm font-mono font-medium text-foreground">
            {truncAddr(bid.bidder)}
          </p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(bid.timestamp)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-base font-semibold font-mono ${
            isTop ? "text-primary" : "text-foreground"
          }`}
        >
          ${bid.amount.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">USDC</p>
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
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-sidebar border-l border-border/50 shadow-2xl"
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

function chainIdFromWallet(wallet: { chainId: string }): number {
  const raw = wallet.chainId;
  return parseInt(raw.includes(":") ? raw.split(":")[1] : raw);
}

function onChainToAuctionListing(
  l: OnChainListing,
  chainId: number
): AuctionListing {
  const asset = getAssetByDxToken(chainId, l.dxToken);
  const uiAsset = asset
    ? xStockAssets.find((a) => a.symbol === asset.symbol)
    : null;
  const symbol = asset?.symbol ?? "???";
  return {
    id: `chain-${l.listingId}`,
    seller: l.seller,
    token: `xd${symbol}`,
    symbol,
    tokenAmount: parseFloat(l.amount),
    quarters: Math.max(1, Math.round(l.leaseDuration / (90 * 86400))),
    startingPrice: parseFloat(l.basePrice),
    highestBid: parseFloat(l.highestBid),
    bids: [], // on-chain listings don't store full bid history
    createdAt: (l.auctionEnd - 7 * 86400) * 1000, // estimate
    endsAt: l.auctionEnd * 1000,
    logo: uiAsset?.logo ?? "",
    color: uiAsset?.color ?? "#888",
    dividendApy: DIVIDEND_APY[symbol] ?? 0,
  };
}

function AuctionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const isCreating = searchParams.get("new") === "1";

  const [search, setSearch] = useState("");
  const [onChainListings, setOnChainListings] = useState<OnChainListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const { fetchListings } = useEscrow();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const hasWallet = authenticated && wallets.length > 0;
  const chainId = hasWallet ? chainIdFromWallet(wallets[0]) : 11155111;

  const refreshListings = useCallback(async () => {
    if (!hasWallet) return;
    setLoadingListings(true);
    try {
      const listings = await fetchListings();
      setOnChainListings(listings);
    } catch (err) {
      console.error("[auction] failed to fetch listings:", err);
    } finally {
      setLoadingListings(false);
    }
  }, [hasWallet, fetchListings]);

  useEffect(() => {
    refreshListings();
  }, [refreshListings]);

  // Convert on-chain listings to UI format, only show open auctions
  const liveAuctions = useMemo(() => {
    return onChainListings
      .filter((l) => l.status === 1) // OpenAuction
      .map((l) => onChainToAuctionListing(l, chainId));
  }, [onChainListings, chainId]);

  const selectedAuction = useMemo(
    () => liveAuctions.find((a) => a.id === selectedId) ?? null,
    [selectedId, liveAuctions]
  );

  const selectedOnChain = useMemo(() => {
    if (!selectedId?.startsWith("chain-")) return undefined;
    const id = parseInt(selectedId.replace("chain-", ""));
    return onChainListings.find((l) => l.listingId === id);
  }, [selectedId, onChainListings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return liveAuctions;
    const q = search.toLowerCase();
    return liveAuctions.filter(
      (a) =>
        a.token.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q)
    );
  }, [search, liveAuctions]);

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
      {loadingListings ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading auctions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {hasWallet ? "No active auctions. Be the first to list!" : "Connect wallet to see auctions."}
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
          <AuctionDetailPanel
            auction={selectedAuction}
            onClose={closePanel}
            onChainListing={selectedOnChain}
            onSuccess={refreshListings}
          />
        )}
      </SlidePanel>

      {/* Create listing slide panel */}
      <SlidePanel open={isCreating} onClose={closePanel}>
        <ListAuctionPanel
          onClose={closePanel}
          onSuccess={refreshListings}
          chainId={chainId}
        />
      </SlidePanel>
    </div>
  );
}
