"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Vault,
  BarChart3,
  Briefcase,
  Menu,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/vault", label: "Vault", icon: Vault },
  { href: "/app/markets", label: "Markets", icon: BarChart3 },
  { href: "/app/portfolio", label: "Portfolio", icon: Briefcase },
];

function useSessionStatus() {
  const [status, setStatus] = useState({ open: false, label: "CLOSED" });

  useEffect(() => {
    function check() {
      const now = new Date();
      const utcH = now.getUTCHours();
      const utcM = now.getUTCMinutes();
      const day = now.getUTCDay();
      const mins = utcH * 60 + utcM;
      // NYSE: Mon-Fri 9:30-16:00 ET = 13:30-20:00 UTC (approx, ignoring DST)
      const isWeekday = day >= 1 && day <= 5;
      const inSession = mins >= 810 && mins < 1200; // 13:30 - 20:00
      const open = isWeekday && inSession;
      setStatus({ open, label: open ? "NYSE OPEN" : "CLOSED" });
    }
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return status;
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4 }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-[#c8ff00]/10 text-[#c8ff00]"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        <Icon className={`size-4 ${active ? "text-[#c8ff00]" : ""}`} />
        {label}
        {active && (
          <motion.div
            layoutId="nav-indicator"
            className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c8ff00]"
          />
        )}
      </motion.div>
    </Link>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <Link href="/app" className="flex items-center gap-2">
          <Image
            src="/logo-transparent.png"
            alt="pendleX"
            width={32}
            height={32}
          />
          <span className="font-[family-name:var(--font-safira)] text-lg tracking-tight">
            pendle<span className="text-[#c8ff00]">X</span>
          </span>
        </Link>
      </div>
      <Separator className="mx-4 w-auto opacity-50" />
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navLinks.map((link) => (
          <NavItem
            key={link.href}
            {...link}
            active={
              link.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(link.href)
            }
          />
        ))}
      </nav>
      <div className="p-4 pt-2">
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">pendleX Markets</p>
          <p>Split. Trade. Earn.</p>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { login, authenticated, user } = usePrivy();
  const session = useSessionStatus();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border/50 bg-[#0e0e0e]">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="md:hidden" />
        <SheetContent side="left" className="w-56 p-0 bg-[#0e0e0e]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent pathname={pathname} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border/50 bg-[#0e0e0e]/80 backdrop-blur-sm px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
            </Sheet>

            <div className="flex items-center gap-2">
              <Circle
                className={`size-2 fill-current ${
                  session.open ? "text-green-500" : "text-red-500"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  session.open ? "text-green-500" : "text-red-500"
                }`}
              >
                {session.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authenticated && user?.wallet?.address && (
              <Badge variant="secondary" className="font-mono text-xs">
                {user.wallet.address.slice(0, 6)}...
                {user.wallet.address.slice(-4)}
              </Badge>
            )}
            <Button
              size="sm"
              onClick={authenticated ? undefined : login}
              className={
                authenticated
                  ? "bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20 hover:bg-[#c8ff00]/20"
                  : "bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80"
              }
            >
              {authenticated ? "Connected" : "Connect Wallet"}
            </Button>
          </div>
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
