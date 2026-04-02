"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Vault,
  BarChart3,
  Briefcase,
  Presentation,
  BookOpen,
  Gavel,
  Menu,
  Circle,
  Wallet,
  ChevronDown,
  Droplets,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { APP_NAME_FULL } from "@/lib/constants";
import { LogoWordmark } from "@/components/LogoWordmark";
import { MarketTickerMarquee } from "@/components/MarketTickerMarquee";
import TermsGate from "@/components/TermsGate";
import { type Network } from "@/components/NetworkSelector";
import { ModeProvider, useAppMode } from "@/lib/mode-context";
import {
  ContractModeProvider,
  useContractMode,
} from "@/lib/contract-mode-context";

// ---- Network config (mirrors NetworkSelector but owned here for chain switching) ----

const networks: Network[] = [
  { id: "ink-sepolia", name: "Ink Sepolia", shortName: "Ink Sepolia", chainId: 763373, color: "#7C3AED", isTestnet: true },
  { id: "sepolia", name: "Eth Sepolia", shortName: "Eth Sepolia", chainId: 11155111, color: "#627EEA", isTestnet: true },
];

function useNetwork() {
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(networks[0]);
  return { selectedNetwork, setSelectedNetwork };
}

// ---- Nav links ----

const navLinks = [
  { href: "/app", label: "Dashboard", grandmaLabel: "Home", icon: LayoutDashboard, hideInGrandma: false },
  { href: "/app/vault", label: "Vault", grandmaLabel: "Savings", icon: Vault, hideInGrandma: false },
  { href: "/app/markets", label: "Markets", grandmaLabel: "Investments", icon: BarChart3, hideInGrandma: false },
  { href: "/app/auction", label: "Auction", grandmaLabel: "Auction", icon: Gavel, hideInGrandma: true },
  { href: "/app/portfolio", label: "Portfolio", grandmaLabel: "My Stuff", icon: Briefcase, hideInGrandma: false },
  { href: "/pitch", label: "Pitch", grandmaLabel: "Pitch", icon: Presentation, hideInGrandma: true },
  { href: "/docs", label: "Docs", grandmaLabel: "Docs", icon: BookOpen, hideInGrandma: true },
];

// ---- Session status ----

function useSessionStatus() {
  const [status, setStatus] = useState({ open: false, label: "CLOSED" });
  useEffect(() => {
    function check() {
      const now = new Date();
      const day = now.getUTCDay();
      const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
      const open = day >= 1 && day <= 5 && mins >= 810 && mins < 1200;
      setStatus({ open, label: open ? "NYSE OPEN" : "CLOSED" });
    }
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);
  return status;
}

// ---- Nav item ----

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4 }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
      >
        <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
        {label}
        {active && (
          <motion.div
            layoutId="nav-indicator"
            className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
          />
        )}
      </motion.div>
    </Link>
  );
}

// ---- Mode toggle (pill slider) ----

function ModeToggle() {
  const { mode, toggleMode, isGrandma } = useAppMode();

  return (
    <div
      onClick={toggleMode}
      className="relative flex items-center h-9 rounded-full bg-[#eee] border border-black/[0.07] cursor-pointer select-none overflow-hidden"
    >
      {/* Sliding thumb */}
      <motion.div
        className="absolute top-[3px] bottom-[3px] w-[calc(50%-5px)] rounded-full bg-white border border-black/[0.10] shadow-sm"
        animate={{ left: isGrandma ? "calc(50% + 2px)" : "3px" }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      />
      <span
        className={`relative z-10 flex-1 text-center text-xs font-medium transition-colors duration-200 ${!isGrandma ? "text-primary" : "text-black/30"
          }`}
      >
        Expert
      </span>
      <span
        className={`relative z-10 flex-1 text-center text-xs font-medium transition-colors duration-200 ${isGrandma ? "" : "text-black/30"
          }`}
      >
        Simple
      </span>
    </div>
  );
}

// ---- Contract mode toggle (Prod / Mock) ----

function ContractModeToggle() {
  const { contractMode, toggleContractMode, isMock } = useContractMode();

  return (
    <div
      onClick={toggleContractMode}
      className="relative flex items-center h-8 rounded-full bg-[#eee] border border-black/[0.07] cursor-pointer select-none overflow-hidden"
    >
      <motion.div
        className="absolute top-[2px] bottom-[2px] w-[calc(50%-4px)] rounded-full bg-white border border-black/[0.10] shadow-sm"
        animate={{ left: isMock ? "calc(50% + 2px)" : "2px" }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      />
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-medium transition-colors duration-200 ${
          !isMock ? "text-green-600" : "text-black/30"
        }`}
      >
        Prod
      </span>
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-medium transition-colors duration-200 ${
          isMock ? "text-orange-600" : "text-black/30"
        }`}
      >
        Mock
      </span>
    </div>
  );
}

// ---- Wallet panel ----

function WalletPanel({
  authenticated,
  walletAddress,
  login,
  logout,
  selectedNetwork,
  onNetworkChange,
}: {
  authenticated: boolean;
  walletAddress?: string;
  login: () => void;
  logout: () => void;
  selectedNetwork: Network;
  onNetworkChange: (n: Network) => void;
}) {
  const [copied, setCopied] = useState(false);
  const faucetUrls: Record<string, string> = {
    "ink-sepolia": "https://inkonchain.com/en/faucet",
    "sepolia": "https://www.alchemy.com/faucets/ethereum-sepolia",
  };
  const faucetUrl = faucetUrls[selectedNetwork.id];

  async function copyWalletAddress() {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. permission denied)
    }
  }

  return (
    <div className="mx-3 rounded-xl bg-white border border-black/[0.05] overflow-hidden">
      {/* Network row */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-black/[0.03] transition-colors group" />
          }
        >
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: selectedNetwork.color }}
          />
          <span className="flex-1 text-left text-xs font-medium text-foreground">
            {selectedNetwork.name}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" sideOffset={8} className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Testnets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {networks.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => onNetworkChange(n)}
              className="gap-2.5 cursor-pointer"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: n.color }} />
              <span className="flex-1 text-sm">{n.name}</span>
              {selectedNetwork.id === n.id && (
                <span className="size-1.5 rounded-full bg-primary" />

              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-px bg-black/[0.04] mx-3" />

      {/* Wallet row */}
      <div className="px-3 py-2.5 space-y-2">
        {authenticated && walletAddress ? (
          <>
            <button
              type="button"
              onClick={copyWalletAddress}
              title="Copy address"
              aria-label="Copy wallet address"
              className="flex items-center gap-2 w-full min-w-0 rounded-lg px-1 -mx-1 py-1 text-left hover:bg-black/[0.04] transition-colors group"
            >
              <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="size-3 text-primary" />
              </div>
              <span className="flex-1 min-w-0 font-mono text-xs text-foreground truncate">
                {copied
                  ? "Copied"
                  : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </span>
              {copied ? (
                <Check className="size-3.5 shrink-0 text-green-600" aria-hidden />
              ) : (
                <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-70 group-hover:opacity-100" aria-hidden />
              )}
              <span className="flex size-1.5 shrink-0 rounded-full bg-green-500" title="Connected" />
            </button>
            <button
              onClick={logout}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
            >
              Disconnect
            </button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={login}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-medium text-xs h-8"
          >
            <Wallet />
            Connect Wallet
          </Button>
        )}

        {/* Faucet link (testnet only, always visible if on testnet) */}
        {selectedNetwork.isTestnet && faucetUrl && (
          <a
            href={`${faucetUrl}${walletAddress ? `?address=${walletAddress}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full text-[11px] text-primary/80 hover:text-primary transition-colors py-0.5"
          >
            <Droplets className="size-3" />
            Get testnet ETH
          </a>
        )}
      </div>
    </div>
  );
}

// ---- Sidebar content ----

function SidebarContent({
  pathname, authenticated, walletAddress, login, logout,
  selectedNetwork, onNetworkChange,
}: {
  pathname: string;
  authenticated: boolean;
  walletAddress?: string;
  login: () => void;
  logout: () => void;
  selectedNetwork: Network;
  onNetworkChange: (n: Network) => void;
}) {
  const { isGrandma } = useAppMode();
  const visibleLinks = isGrandma ? navLinks.filter((l) => !l.hideInGrandma) : navLinks;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 pb-3">
        <LogoWordmark href="/app" />
      </div>
      <Separator className="mx-4 w-auto opacity-40" />

      {/* Mode toggle */}
      <div className="px-3 pt-3 pb-1">
        <ModeToggle />
      </div>
      <Separator className="mx-4 w-auto opacity-40 mt-2" />

      {/* Contract mode toggle */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-[10px] text-muted-foreground mb-1 px-1">Contracts</p>
        <ContractModeToggle />
      </div>
      <Separator className="mx-4 w-auto opacity-40 mt-2" />

      {/* Wallet panel */}
      <div className="pt-3 pb-1">
        <WalletPanel
          authenticated={authenticated}
          walletAddress={walletAddress}
          login={login}
          logout={logout}
          selectedNetwork={selectedNetwork}
          onNetworkChange={onNetworkChange}
        />
      </div>
      <Separator className="mx-4 w-auto opacity-40 mt-2" />

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {visibleLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={isGrandma ? link.grandmaLabel : link.label}
            icon={link.icon}
            active={
              link.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(link.href)
            }
          />
        ))}
      </nav>

      {/* Tagline */}
      <div className="p-4 pt-2">
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">{APP_NAME_FULL}</p>
          <p>dx yield, px price, one vault.</p>
        </div>
      </div>
    </div>
  );
}

// ---- Main layout ----

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const session = useSessionStatus();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { selectedNetwork, setSelectedNetwork } = useNetwork();
  const walletAddress = user?.wallet?.address;

  async function handleNetworkChange(network: Network) {
    setSelectedNetwork(network);
    // Switch chain on the active embedded/connected wallet
    if (authenticated && wallets.length > 0) {
      try {
        await wallets[0].switchChain(network.chainId);
      } catch {
        // User rejected or unsupported chain -- silently ignore
      }
    }
  }

  const sidebarProps = {
    pathname,
    authenticated,
    walletAddress,
    login,
    logout,
    selectedNetwork,
    onNetworkChange: handleNetworkChange,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border/50 bg-sidebar">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="md:hidden" />
        <SheetContent side="left" className="w-56 p-0 bg-sidebar">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent {...sidebarProps} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border/50 bg-sidebar/80 backdrop-blur-sm px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden shrink-0" />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
          </Sheet>

          <LogoWordmark
            href="/app"
            className="min-w-0 shrink md:hidden"
            iconSize={28}
            textClassName="text-sm sm:text-base"
          />

          <div className="flex shrink-0 items-center gap-2">
            <Circle
              className={`size-2 fill-current ${session.open ? "text-green-500" : "text-red-500"}`}
            />
            <span className={`text-xs font-medium ${session.open ? "text-green-500" : "text-red-500"}`}>
              {session.label}
            </span>
          </div>

          <MarketTickerMarquee />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TermsGate>
      <ModeProvider>
        <ContractModeProvider>
          <AppLayoutInner>{children}</AppLayoutInner>
        </ContractModeProvider>
      </ModeProvider>
    </TermsGate>
  );
}
