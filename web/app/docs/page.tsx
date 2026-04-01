import type { ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { DocsNav } from "@/components/docs/DocsNav";
import { DOCS_NAV } from "@/lib/docs-toc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/constants";

function ProseP({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{children}</p>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-safira)] text-2xl text-foreground">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 font-mono text-sm font-medium uppercase tracking-widest text-accent">
      {children}
    </h3>
  );
}

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <DocsNav items={DOCS_NAV} variant="mobile" className="sticky top-16 z-40" />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:gap-14 lg:px-8 lg:py-12">
        <aside className="hidden w-52 shrink-0 lg:block xl:w-56">
          <DocsNav items={DOCS_NAV} variant="sidebar" />
        </aside>

        <main className="min-w-0 flex-1 pb-16">
          <div className="mb-10 max-w-3xl">
            <Badge variant="secondary" className="mb-3">
              Protocol
            </Badge>
            <h1 className="font-[family-name:var(--font-safira)] text-4xl tracking-tight text-foreground sm:text-5xl">
              Documentation
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {APP_NAME} splits tokenized equity ETFs (xStocks) into a dividend token
              (dx) and a principal token (px) on Base. This reference summarizes
              product behavior from the protocol specification.
            </p>
          </div>

          <div className="max-w-3xl space-y-14">
            <section id="overview" className="scroll-mt-28">
              <SectionTitle>Overview</SectionTitle>
              <ProseP>
                {APP_NAME} is a DeFi protocol that splits xStocks into two tradeable
                instruments: <strong className="text-foreground/90">dx</strong>{" "}
                (dividend rights) and{" "}
                <strong className="text-foreground/90">px</strong> (pure price
                exposure). dx trades in a 24/7 income market; px supports a
                leveraged exchange that follows NYSE session hours, with prices from
                Pyth Network.
              </ProseP>
              <ProseP>
                Initial assets target AAPL, ABT, and SPY xStock tokens. Additional
                ERC-20 xStocks can be registered through the protocol. v1 ships as
                non-custodial contracts on Base only: no governance token, no fiat
                ramps, and no cross-chain deployment in the first release.
              </ProseP>
            </section>

            <Separator />

            <section id="problem" className="scroll-mt-28">
              <SectionTitle>Problem</SectionTitle>
              <ProseP>
                Whole xStocks bundle yield and price. Income-oriented users must take
                equity volatility they do not want. Short-horizon traders implicitly
                pay for dividend yield even on intraday positions. {APP_NAME} unbundles
                those payoffs so each audience can trade the exposure it actually
                wants.
              </ProseP>
            </section>

            <Separator />

            <section id="goals" className="scroll-mt-28">
              <SectionTitle>Goals</SectionTitle>
              <SubTitle>In scope</SubTitle>
              <ul className="mt-3 list-inside list-disc space-y-2 text-[15px] text-muted-foreground">
                <li>Split registered xStocks into dx and px via one vault.</li>
                <li>Route 100% of dividend rebases to dx using an accumulator.</li>
                <li>24/7 secondary liquidity for dx; session-gated px exchange with USDC.</li>
                <li>Pyth as the sole price oracle for exchange operations.</li>
                <li>Recombination (burn dx + px) to redeem xStock for arbitrage bounds.</li>
              </ul>
              <SubTitle>Out of scope (v1)</SubTitle>
              <ul className="mt-3 list-inside list-disc space-y-2 text-[15px] text-muted-foreground">
                <li>Custodial wallet product; raw non-xStock equities.</li>
                <li>Governance token, fiat on/off-ramps, cross-chain deployment.</li>
                <li>Perpetuals: px positions settle with the daily session design.</li>
              </ul>
            </section>

            <Separator />

            <section id="personas" className="scroll-mt-28">
              <SectionTitle>Personas</SectionTitle>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    name: "Alice",
                    role: "Income investor",
                    text: "Holds dx for yield; avoids px price risk.",
                  },
                  {
                    name: "Bob",
                    role: "Day trader",
                    text: "Long/short px in session with USDC; no dividend drag.",
                  },
                  {
                    name: "Carol",
                    role: "Yield stripper",
                    text: "Splits xStock, sells px, holds cheaper dx yield.",
                  },
                  {
                    name: "Dave",
                    role: "Arbitrageur",
                    text: "Trades mispricing between xStock and dx + px.",
                  },
                  {
                    name: "Eve",
                    role: "LP",
                    text: "Supplies USDC to px pools; earns trading fees.",
                  },
                ].map((p) => (
                  <Card key={p.name} className="border-border/80 bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {p.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          -- {p.role}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {p.text}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            <section id="architecture" className="scroll-mt-28">
              <SectionTitle>Architecture</SectionTitle>
              <ProseP>
                Users interact with <strong className="text-foreground/90">XStreamVault</strong>{" "}
                (deposit, withdraw, claim, sync) and{" "}
                <strong className="text-foreground/90">XStreamExchange</strong>{" "}
                (open/close long and short, liquidate). Each asset has a{" "}
                <strong className="text-foreground/90">PrincipalToken</strong> (px) and{" "}
                <strong className="text-foreground/90">DividendToken</strong> (dx). The
                exchange uses USDC LP pools and px inventory for shorts.{" "}
                <strong className="text-foreground/90">PythAdapter</strong> normalizes
                prices; <strong className="text-foreground/90">MarketKeeper</strong>{" "}
                opens and closes sessions and coordinates settlement batches.
              </ProseP>
              <ProseP>
                Invariant: vault{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">
                  totalDeposited
                </code>{" "}
                tracks principal shares; the dividend reserve is accounted separately
                so the two pools are never mixed.
              </ProseP>
            </section>

            <Separator />

            <section id="tokens" className="scroll-mt-28">
              <SectionTitle>dx and px tokens</SectionTitle>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card className="border-accent/20 bg-accent/[0.03]">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-base text-accent">
                      Dividend token (dx)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Freely transferable ERC-20. Accrues pro-rata at each sync; no
                    retroactive yield for buyers after the fact. Claims are in xStock
                    units. Secondary price is anchored by expected dividends and
                    recombination arbitrage.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-base text-foreground">
                      Principal token (px)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    No dividend accrual; balance unchanged by rebases. Collateral for
                    leveraged long/short px trading against USDC during allowed
                    sessions.
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            <section id="vault" className="scroll-mt-28">
              <SectionTitle>Vault</SectionTitle>
              <ProseP>
                Deposit xStock to mint matched dx and px. The vault tracks rebase
                via <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">multiplier()</code>{" "}
                snapshots and attributes the full dividend delta to dx via{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  accDivPerShare
                </code>{" "}
                at 1e36 precision.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  claimDividend
                </code>{" "}
                is O(1) gas. Deposits and withdrawals settle pending rewards first.
                Recombination burns equal dx and px to return xStock plus unclaimed
                dividends. dx transfers can auto-claim and reset reward debt to
                prevent yield gaming.
              </ProseP>
              <ProseP>
                Optional: public <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">syncDividend</code>,{" "}
                per-asset <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">minDepositAmount</code>,{" "}
                and owner pause that blocks deposit/withdraw but not claims.
              </ProseP>
            </section>

            <Separator />

            <section id="dx-market" className="scroll-mt-28">
              <SectionTitle>dx market</SectionTitle>
              <ProseP>
                dx can list on any compatible DEX or OTC venue. Pricing reflects the
                next dividend events and the floor implied by mint/burn parity with
                xStock. A read-only view can expose pending dividends per user for
                UI without sending a transaction.
              </ProseP>
            </section>

            <Separator />

            <section id="exchange" className="scroll-mt-28">
              <SectionTitle>px exchange</SectionTitle>
              <ProseP>
                USDC collateral backs long and short px positions. Default max
                leverage is 5x per pool (configurable). Long PnL settles from the LP
                pool; losses hit collateral. Shorts draw px from protocol reserve at
                open and return px at close, with USDC netting PnL. Opens are blocked
                when the market is closed; closes and liquidations can still run.
              </ProseP>
              <ProseP>
                At session close, the keeper may call batch settlement to force-close
                positions at the closing oracle price. Liquidation triggers near{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  healthFactor &lt; 0.2
                </code>
                ; a share of remaining collateral rewards the liquidator. Opening
                fees accrue to LPs; reserve providers can earn fees on short
                notional where the design enables it.
              </ProseP>
            </section>

            <Separator />

            <section id="oracle-sessions" className="scroll-mt-28">
              <SectionTitle>Oracle and sessions</SectionTitle>
              <ProseP>
                Pyth uses a pull model: transactions include a fresh signed update
                (VAA from Hermes). The adapter normalizes to 1e18. Updates older
                than <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">maxStaleness</code>{" "}
                (often 60s) revert. Integrators read{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">getUpdateFee()</code>{" "}
                to forward the correct <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">msg.value</code>.{" "}
                Cached reads may be available for display-only price UIs.
              </ProseP>
              <ProseP>
                Authorized keepers call <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">openMarket</code>{" "}
                and <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">closeMarket</code>.{" "}
                Close can batch Pyth data for all assets and drive settlement.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">emergencyCloseMarket</code>{" "}
                halts new risk without forcing settlement when the oracle is impaired.
                Multiple keeper addresses are supported for automation or redundancy.
              </ProseP>
            </section>

            <Separator />

            <section id="economics" className="scroll-mt-28">
              <SectionTitle>Economics</SectionTitle>
              <ProseP>
                Example fee settings from the specification: 0.05% of notional on
                position open to the USDC LP pool; 0.025% on short notional to px
                reserve LPs where applicable; liquidation splits between liquidator
                and pool per parameters. Projected dx APY mixes base dividend (for
                example SPY near 1.3%) with trading-fee flow; illustrated totals
                around 12-16% are not guarantees.
              </ProseP>
              <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-mono text-xs text-muted-foreground">
                      <th className="p-3">Fee</th>
                      <th className="p-3">Typical rate</th>
                      <th className="p-3">Recipient</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <td className="p-3">Open</td>
                      <td className="p-3 font-mono text-accent">0.05%</td>
                      <td className="p-3">USDC LP</td>
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="p-3">Short reserve</td>
                      <td className="p-3 font-mono">0.025%</td>
                      <td className="p-3">px reserve</td>
                    </tr>
                    <tr>
                      <td className="p-3">Liquidation reward</td>
                      <td className="p-3">10% of remainder</td>
                      <td className="p-3">Liquidator</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <Separator />

            <section id="contracts" className="scroll-mt-28">
              <SectionTitle>Contract inventory</SectionTitle>
              <ul className="mt-4 space-y-2 font-mono text-sm text-muted-foreground">
                <li>
                  <span className="text-foreground">XStreamVault</span> -- split,
                  recombine, dividend routing (one deployment).
                </li>
                <li>
                  <span className="text-foreground">PrincipalToken</span> /{" "}
                  <span className="text-foreground">DividendToken</span> -- per asset
                  px and dx.
                </li>
                <li>
                  <span className="text-foreground">XStreamExchange</span> -- pooled
                  trading (one deployment).
                </li>
                <li>
                  <span className="text-foreground">LPToken</span> -- per-pool LP
                  shares (non-transferable in v1 per spec).
                </li>
                <li>
                  <span className="text-foreground">PythAdapter</span>,{" "}
                  <span className="text-foreground">MarketKeeper</span> -- oracle
                  normalization and session control.
                </li>
              </ul>
            </section>

            <Separator />

            <section id="security" className="scroll-mt-28">
              <SectionTitle>Security and engineering</SectionTitle>
              <ProseP>
                Contracts aim for reentrancy protection on state-changing paths,
                checks-effects-interactions ordering, and heavy testing on the
                dividend accumulator and settlement logic. v1 is non-upgradeable with
                owner-tunable parameters. Pools cap open interest so batch settlement
                stays within gas limits. Target: independent audit before mainnet.
              </ProseP>
            </section>

            <Separator />

            <section id="risks" className="scroll-mt-28">
              <SectionTitle>Risks</SectionTitle>
              <ProseP>
                Smart contract bugs, oracle failures, keeper downtime, and thin
                liquidity can all cause losses. Tokenized equities may be restricted
                in some regions. This documentation is not legal or investment
                advice. Verify live parameters on deployed contracts and read audit
                reports when available.
              </ProseP>
            </section>
          </div>

          <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-10">
            <Link
              href="/app"
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Open app
            </Link>
            <Link
              href="/pitch"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Investor pitch
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Home
            </Link>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
