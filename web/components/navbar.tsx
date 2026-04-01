"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LogoWordmark } from "@/components/LogoWordmark";

const navLinks = [
  { label: "Markets", href: "/app/markets" },
  { label: "Vault", href: "/app/vault" },
  { label: "Portfolio", href: "/app/portfolio" },
  { label: "Pitch", href: "/pitch" },
  { label: "Docs", href: "/docs" },
];

export default function Navbar() {
  const { login, authenticated, user } = usePrivy();
  const [open, setOpen] = useState(false);

  const address = user?.wallet?.address;
  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <LogoWordmark href="/" />

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop wallet button */}
        <div className="hidden md:block">
          {authenticated && truncated ? (
            <Button variant="outline" size="sm">
              {truncated}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80 font-medium"
              onClick={login}
            >
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle>
                  <LogoWordmark href="/" iconSize={24} textClassName="text-sm" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 border-t border-border pt-4">
                  {authenticated && truncated ? (
                    <Button variant="outline" className="w-full">
                      {truncated}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-[#c8ff00] text-[#0a0a0a] hover:bg-[#c8ff00]/80 font-medium"
                      onClick={() => {
                        login();
                        setOpen(false);
                      }}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
