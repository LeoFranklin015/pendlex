# pendleX Markets — Product Requirements Document

**Version 1.0 · April 2026 · DRAFT**
**Status:** Pre-Build / Hackathon Scope

---

> **Core Value Proposition:** Two tokens. Two markets. One vault. Income investors get predictable yield. Traders get clean leveraged exposure with no overnight risk. Arbitrageurs keep everything efficient. All positions settle back to the underlying at any time.

---

## 1. Executive Summary

pendleX Markets is a DeFi protocol that splits tokenized ETFs (xStocks) into two independently tradeable instruments: an income token (xdSPY) representing the dividend stream, and a price exposure token (xpSPY) representing pure price movement. Each token powers its own dedicated market with distinct mechanics, participants, and trading hours.

The protocol introduces a novel financial primitive — on-chain dividend stripping — that has no existing equivalent in DeFi. TradFi has STRIPS bonds and equity futures, but nobody has combined yield separation, leveraged day trading, and atomic recombination in a single permissionless vault.

---

## 2. Problem Statement

Tokenized equities (xStocks) currently exist as monolithic instruments. Holders who want price exposure are forced to carry the dividend component, and holders who want yield must also bear price risk. This creates several inefficiencies:

- **Day traders pay for yield implicitly.** A trader holding xSPY for 6 hours doesn't care about a quarterly dividend but is pricing it in.
- **Income investors bear price risk.** A DAO treasury seeking stable yield from SPY dividends has no way to isolate the income stream from daily price volatility.
- **No leverage primitive exists for xStocks.** There is no clean way to get 2–5x leveraged exposure to xStock price movement without perps infrastructure.
- **Dividend rebases are opaque.** When xStocks rebase for dividends, all holders receive them equally — there's no market for pricing or trading the dividend itself.

---

## 3. Product Overview

### 3.1 Token Architecture

The protocol produces two ERC-20 tokens from every deposited xStock:

| | xdSPY (Income Token) | xpSPY (Price Token) |
|---|---|---|
| **Standard** | ERC-20 with reward accumulator | Plain ERC-20 |
| **Represents** | Dividend stream only | Price movement only (no dividends) |
| **Behavior** | Accrues value toward next rebase; claimable dividends | Tracks xStock price 1:1 minus dividend component |
| **Market Hours** | 24/7 — yield doesn't sleep | NYSE hours only (9:30 AM–4:00 PM EST) |
| **Target Users** | Income investors, DAOs, treasuries | Day traders, momentum traders, speculators |
| **Leverage** | None | 2–5x via USDC collateral |

### 3.2 Mint/Burn Invariant

The protocol enforces a hard 1:1:1 invariant at all times:

- **Mint:** 1 xSPY deposited → 1 xdSPY + 1 xpSPY minted
- **Burn:** 1 xdSPY + 1 xpSPY burned → 1 xSPY redeemed

This invariant is the protocol's pricing anchor. If secondary market prices diverge, arbitrageurs recombine or split to capture the spread. No oracle is needed for this — the mechanism is self-correcting.

> ⚠️ **Critical Implementation Detail:** Recombination must force-claim any pending dividends on the xdSPY being burned before redeeming the underlying xSPY. Without this, xdSPY + xpSPY < xSPY after any rebase, which breaks the arbitrage invariant.

---

## 4. Protocol Layers

### 4.1 Layer 1: The Vault (Splitter)

The vault is a custom contract (not ERC-4626 — that standard assumes single-token output). It accepts xStock deposits and manages dual-token minting.

**Vault Responsibilities:**

- Accept xStock deposits and mint paired xdToken + xpToken
- Accept paired burns and return underlying xStock
- Detect rebase events (xStock balance changes) and route 100% to dividend accumulator
- Track reward-per-share for dividend distribution
- Expose a public `sync()` function for rebase detection

**Rebase Interception:**

xStocks rebase for dividends, meaning the vault's token balance increases without any transaction. The vault must detect and attribute this correctly:

1. On any state-changing call (deposit, withdraw, claim, sync), vault compares current xStock balance against last recorded balance.
2. Delta = rebase amount. This is added to the reward accumulator: `rewardPerShare += delta * 1e18 / totalXdSupply`.
3. `lastKnownBalance` is updated.
4. xpToken holders receive nothing — the vault's accounting simply doesn't attribute the rebase to them.

A public `sync()` function allows anyone (or a keeper) to trigger rebase detection outside of user interactions.

---

### 4.2 Layer 2: xdSPY Income Market

**Market Structure:**

- Trading pair: xdSPY / USDC
- AMM type: Standard constant-product pool (Uniswap V2 style)
- Operating hours: 24/7 — xdSPY value is tied to dividend schedule, not intraday price
- No oracle dependency — price discovery is organic against known dividend calendar

**Price Dynamics:**

xdSPY price follows a sawtooth pattern aligned with dividend cycles: it slowly accrues value as the next dividend date approaches, spikes when the rebase hits and holders claim, then resets and begins accruing again. This is conceptually identical to a zero-coupon bond approaching maturity.

**Revenue Streams to xdSPY Holders:**

| Source | Frequency | Estimated APY Contribution |
|---|---|---|
| xStock dividend rebases | Quarterly (SPY schedule) | ~1.3% |
| xpSPY session borrow fees | Daily during market hours | ~10–15% |
| Vault mint/burn spread (optional) | Per transaction | ~0.5–1% |
| **Total projected xdSPY APY** | | **~12–16%** |

This yield is backed by real equity dividends and protocol trading fees — not inflationary token emissions.

---

### 4.3 Layer 3: xpSPY Leveraged Day Trading Market

**Core Mechanic:**

xpSPY is a session-based leveraged trading instrument that explicitly opens and closes with NYSE market hours. Because xStock prices are frozen outside market hours, this creates a clean session-based trading model with provably fair settlement.

**Session Lifecycle:**

| Time | Action |
|---|---|
| **9:30 AM EST** | Session opens. Traders can post USDC collateral and borrow xpSPY from lending pool. Leverage range: 2–5x. |
| **9:30–4:00 PM** | Active trading. Continuous health factor monitoring. Liquidation triggers if health factor drops below threshold. Borrow fees accrue per-second. |
| **4:00 PM EST** | Session closes. All positions force-settled. P&L calculated against session open price. Profits paid from counterparty pool, losses deducted from collateral. xpSPY returns to vault. |
| **4:00 PM–9:30 AM** | No trading. xpSPY sits in vault. Zero price risk. No borrow fees accruing. |

**Leverage Mechanism:**

1. Trader deposits USDC as collateral into margin contract.
2. Borrows xpSPY from the lending pool at configured leverage (2–5x).
3. Entry price is recorded. Borrow fee begins accruing (per-second rate).
4. During session: `healthFactor = (collateral + unrealizedPnL) / borrowedValue`.
5. At session close (or earlier if trader exits): P&L settled, collateral adjusted, xpSPY returned.

**Circuit Breaker Integration:**

The protocol's risk engine is aware of NYSE circuit breaker levels and responds accordingly. Circuit breakers are used as a protocol-level state machine layered on top of standard health-factor liquidation:

| Breaker Level | NYSE Trigger | Protocol Response |
|---|---|---|
| **Level 1** | S&P 500 down 7% | Pause new position openings. Existing positions still subject to normal health-factor liquidation. Prevents piling into leverage during crash. |
| **Level 2** | S&P 500 down 13% | Pause all xpSPY trading (no new borrows, no sells). Existing liquidations still process to protect lending pool. |
| **Level 3** | S&P 500 down 20% | Full freeze. No liquidations, no trading. Market has declared price discovery broken. Settle everything at last valid pre-halt price. Recalculate on next market open. |

> ✅ **Design Rationale:** Circuit breakers are a pause mechanism, not a liquidation threshold replacement. Standard health-factor liquidation protects the lending pool during normal volatility. Circuit breaker integration protects traders from being liquidated against broken prices when the underlying market itself has halted.

---

### 4.4 Layer 4: Recombination Arbitrage

The recombination mechanism is the pricing glue that keeps all markets efficient. It enforces that xdSPY + xpSPY ≈ xSPY at all times:

| Condition | Arbitrage Action |
|---|---|
| xdSPY + xpSPY < xSPY on secondary markets | Buy both tokens, recombine in vault, redeem xSPY at par. Profit = spread. |
| xdSPY + xpSPY > xSPY on secondary markets | Deposit xSPY in vault, receive both tokens, sell both on secondary. Profit = spread. |

This requires no oracle, no keeper, and no governance intervention. The arbitrage is atomic and permissionless.

---

## 5. User Journeys

### 5.1 Alice — Income Investor

1. Alice buys xdSPY on the 24/7 AMM at a discount to face value (e.g. $1.25 for a ~$1.50 expected quarterly dividend).
2. She holds through the dividend cycle. Her xdSPY accrues value from both the underlying dividend rebase and xpSPY trading session fees.
3. She calls `claim()` to collect accrued dividends in xSPY (or swaps to USDC).
4. After the cycle, she sells xdSPY and reinvests into the next cycle, or holds for continuous accrual.

*Effective behavior: Bond-like yield with no price exposure. Projected 12–16% APY on SPY dividends.*

### 5.2 Bob — Day Trader

1. Market opens at 9:30 AM. Bob deposits 5,000 USDC as collateral.
2. He borrows xpSPY at 3x leverage (15,000 USDC notional SPY exposure).
3. He pays a per-second borrow fee while the position is open.
4. SPY moves 1.5% up during the session. Bob's 3x position earns 4.5% (≈$675).
5. At 4:00 PM, the session auto-settles. Bob receives his collateral plus profit. xpSPY returns to the vault.

*Effective behavior: Clean leveraged SPY exposure during market hours. No overnight risk. No forced daily rollover. No dividend noise.*

### 5.3 Carol — Yield Stripper

1. Carol deposits 100 xSPY into the vault. Receives 100 xdSPY + 100 xpSPY.
2. She immediately sells xpSPY on the secondary market for USDC.
3. She now holds only xdSPY, at a cost basis below the face value of the dividend stream (since she recovered part of her deposit by selling xpSPY).
4. She earns the full dividend yield at a discounted entry price, amplifying her effective APY.

*Effective behavior: Buys the dividend cheaper than holding the full xStock.*

### 5.4 Dave — Arbitrageur

1. Dave monitors the combined secondary market price of xdSPY + xpSPY versus the xSPY spot price.
2. When the spread opens (e.g. combined tokens trade at 0.97x xSPY), he buys both and recombines in the vault.
3. He redeems xSPY at par (1.00x) and profits the 3% spread.
4. This action pushes secondary prices back toward parity, keeping the system efficient.

*Effective behavior: Risk-free arbitrage that serves as the protocol's self-correcting pricing mechanism.*

---

## 6. Technical Requirements

### 6.1 Smart Contract Architecture

| Contract | Standard | Responsibilities |
|---|---|---|
| **SplitterVault** | Custom (not ERC-4626) | Deposit/withdraw xStock; mint/burn paired tokens; rebase detection; dividend accumulator; recombination with forced-claim |
| **xdToken** | ERC-20 + accumulator | Fungible income token; `claim()` for accrued dividends; transferable and AMM-compatible |
| **xpToken** | Plain ERC-20 | Fungible price token; no special logic; transferable and AMM-compatible |
| **SessionManager** | Custom | Market open/close state machine; circuit breaker levels; session P&L settlement; keeper interface |
| **MarginEngine** | Custom | Collateral management; borrow/repay; health factor calculation; liquidation logic; fee accrual |
| **LendingPool** | Custom | xpSPY lending pool for leveraged positions; deposit/withdraw for LPs; utilization-based interest rates |
| **xdSPY AMM Pool** | Uniswap V2 style | 24/7 xdSPY/USDC trading; standard constant-product pricing |
| **xpSPY AMM Pool** | Uniswap V2 style | xpSPY/USDC trading during market hours; paused by SessionManager outside hours |

### 6.2 Dividend Accumulator Pattern

The vault uses a Synthetix-style reward-per-share accumulator. This is the same math used in MasterChef, Synthetix StakingRewards, and similar battle-tested contracts. On every rebase detection:

- `rewardPerShare += (rebaseAmount * PRECISION) / totalXdSupply`
- Each xdSPY holder's pending reward = `(rewardPerShare − userLastCheckpoint) * userBalance / PRECISION`
- Checkpoints update on claim, transfer, mint, and burn

Dividends pay out in xSPY (simplest). Users can swap to USDC independently. A future version could add auto-swap.

### 6.3 Session Oracle

The SessionManager contract needs to know when NYSE is open, closed, and halted.

| Approach | Pros | Cons |
|---|---|---|
| **Keeper bot (hackathon)** | Simple to build; team controls it; fast iteration | Centralized; single point of failure |
| **Chainlink Automation** | Decentralized; battle-tested; handles cron-style triggers | Cost; less control over edge cases like early halts |
| **Pyth/Chronicle oracle** | Market-aware; can detect staleness as proxy for halts | Indirect; requires inference logic for halt detection |

**Hackathon recommendation:** Keeper bot with an admin-callable `pauseSession(uint8 level)` for circuit breaker simulation. Upgrade to Chainlink Automation in production.

### 6.4 Fee Architecture

| Fee Type | Charged To | Flows To | Mechanism |
|---|---|---|---|
| Borrow fee | xpSPY leveraged traders | xdSPY holders + protocol | Per-second accrual on open positions |
| Session settlement fee | All session participants | xdSPY holders | Flat % of session volume |
| Mint/burn spread | Vault depositors/redeemers | Protocol treasury | Optional 0.05–0.1% on deposit/withdraw |
| Liquidation penalty | Liquidated traders | Liquidator + protocol | % of collateral seized |

All fee distributions to xdSPY holders use the same reward accumulator as dividends. Claiming dividends and claiming trading fees is one call.

---

## 7. Accounting Edge Cases

These are the subtle problems that will break the protocol if not handled correctly.

**7.1 Recombination After Rebase**

When a user recombines xdSPY + xpSPY after a rebase has occurred but dividends haven't been claimed, the contract must internally call `claimDividend()` before burning. Otherwise the unclaimed dividend value is lost, and xdSPY + xpSPY < xSPY, breaking the arbitrage invariant.

**7.2 Transfer Checkpoint Updates**

When xdSPY is transferred (including AMM swaps), both sender and receiver checkpoints must update atomically. The sender's unclaimed rewards must be preserved (either auto-claimed or recorded). The receiver's checkpoint must be set to the current `rewardPerShare` to prevent them from claiming rewards they didn't earn.

**7.3 Rebase During Open Session**

If an xStock dividend rebase occurs during NYSE trading hours while leveraged positions are open, the vault must route the rebase to xdSPY holders without affecting xpSPY price or leveraged position P&L. The rebase delta is excluded from the xpSPY price calculation used by the margin engine.

**7.4 Empty Vault Edge Case**

If `totalXdSupply = 0` when a rebase occurs, the vault cannot distribute via the accumulator (division by zero). The rebase amount must be held in a buffer and distributed to the first depositor, or treated as protocol revenue.

---

## 8. Protocol State Machine

The SessionManager contract operates as a state machine with the following states:

| State | Allowed Actions | Blocked Actions |
|---|---|---|
| **CLOSED** | Vault deposit/withdraw, xdSPY trading, recombination, dividend claims | xpSPY trading, borrow, new leveraged positions |
| **OPEN** | All actions permitted | None |
| **HALT_L1** | Existing position management, liquidations, xdSPY trading, recombination | New leveraged positions, new borrows |
| **HALT_L2** | Liquidations only, xdSPY trading, recombination, dividend claims | All xpSPY trading, new positions, exits (except liquidation) |
| **HALT_L3** | xdSPY trading, recombination, dividend claims | All xpSPY activity including liquidations. Full freeze. |
| **SETTLING** | Session settlement processing only | All user actions on xpSPY market |

State transitions are triggered by the session oracle (keeper or Chainlink). The xdSPY market and vault operations remain available in all states — only the xpSPY leveraged market is affected by session and halt states.

---

## 9. Risk Parameters

| Parameter | Hackathon Default | Notes |
|---|---|---|
| Max leverage | 3x | Conservative for demo; 5x for production |
| Liquidation threshold | Health factor < 1.1 | Buffer above 1.0 to account for gas/latency |
| Borrow rate (per hour) | 0.01% | Annualizes to ~16% during market hours only |
| Mint/burn fee | 0.05% | Low to encourage arbitrage activity |
| Session settlement fee | 0.1% of notional | Flat fee on all session close settlements |
| Liquidation penalty | 5% of collateral | Split between liquidator (3%) and protocol (2%) |
| Min collateral | 100 USDC | Prevents dust positions |

---

## 10. Build Scope

### 10.1 Hackathon Scope (72 Hours)

**Day 1 — Core Vault + Token Split**

- SplitterVault contract: deposit xSPY → mint xdSPY + xpSPY
- Recombination: burn xdSPY + xpSPY → redeem xSPY (with forced dividend claim)
- Rebase interception with lazy sync + public `sync()`
- Dividend accumulator with `claim()`
- Deploy on testnet with mock xSPY (mock rebase function for demo)

**Day 2 — Markets**

- xdSPY/USDC AMM pool (constant-product)
- xpSPY/USDC AMM pool (session-gated)
- MarginEngine: USDC collateral → borrow xpSPY → leverage
- SessionManager: open/close state machine (keeper-triggered)
- Session settlement logic with P&L calculation
- Fee routing to dividend accumulator

**Day 3 — Demo Polish**

- Dashboard: xdSPY APY display, xpSPY price chart, vault TVL
- Live recombination demo showing arbitrage in action
- Full Alice journey (deposit → earn → claim → withdraw)
- Full Bob journey (collateral → leverage → trade → settle)
- Real SPY dividend schedule with projected APY numbers

### 10.2 Post-Hackathon Roadmap

| Version | Features | Technical Changes |
|---|---|---|
| **v1.1** | Fixed-expiry xdSPY (quarterly cycles), proper orderbook for income market | ERC-1155 xdSPY with epoch IDs; orderbook contract or CLOB integration |
| **v1.2** | Chainlink Automation for session oracle, circuit breaker feed integration | Replace keeper bot; add Chainlink oracle for NYSE halt status |
| **v2.0** | Multi-asset support (xQQQ, xIWM, etc.), cross-margin, portfolio margining | Vault factory pattern; shared margin engine across assets |
| **v2.1** | Auto-compound xdSPY yield, USDC-denominated dividend payouts | Integrated DEX swap on `claim()`; compounding wrapper contract |

---

## 11. Competitive Landscape

No existing DeFi protocol combines all four of these primitives:

| Feature | TradFi | Existing DeFi | pendleX | Closest Analog |
|---|---|---|---|---|
| Yield stripping | STRIPS bonds | **None** | **xdSPY** | Pendle (yield tokens) |
| Pure price exposure | Equity futures | Perps | **xpSPY** | dYdX / GMX perps |
| Recombination arb | Cash-futures basis | Partial (some AMMs) | **Built-in mint/burn** | Curve stETH/ETH |
| Dividend discount market | T-bill market | **None** | **xdSPY secondary** | Pendle PT/YT |
| Session-based leverage | Day trading margin | **None** | **xpSPY sessions** | No DeFi equivalent |

---

## 12. Open Design Questions

| # | Question | Current Recommendation |
|---|---|---|
| 1 | xdSPY maturity model: perpetual accrual vs fixed quarterly expiry? | Perpetual for hackathon (simpler). Upgrade to ERC-1155 fixed-expiry in v1.1. |
| 2 | Dividend payout denomination: xSPY or USDC? | xSPY for hackathon (no swap dependency). Add USDC auto-swap in v2.1. |
| 3 | Should xpSPY be tradeable outside market hours (without leverage)? | Yes — allow spot xpSPY trading 24/7 but restrict leverage to market hours only. Price won't move, but allows position entry/exit. |
| 4 | Who provides initial xpSPY lending pool liquidity? | Protocol-seeded from vault deposits initially. Allow external LPs to deposit xpSPY for yield in v1.2. |
| 5 | Circuit breaker data source for production? | Admin function for hackathon. Chainlink or Pyth feed for production. Needs investigation. |
| 6 | Protocol fee split: what % goes to protocol treasury vs xdSPY holders? | 80% to xdSPY holders / 20% to protocol. Adjustable by governance. |

---

## 13. Success Metrics

**Hackathon Demo:**

- Complete deposit → split → trade → claim → recombine lifecycle on testnet
- Demonstrate rebase interception routing dividend exclusively to xdSPY
- Show one full leveraged session open → trade → settle cycle
- Display projected APY numbers based on real SPY dividend schedule
- Demonstrate recombination arbitrage correcting a price deviation

**Production Launch (v1.0):**

- TVL target: $1M+ in vault deposits within 30 days
- Daily xpSPY session volume: $500K+
- xdSPY APY sustained above 10%
- Recombination spread consistently < 0.5% (tight arbitrage)
- Zero exploit incidents on rebase interception or session settlement

---

*End of Document*