/** Product wordmark (headers, UI) */
export const APP_NAME = "xStream";
/** Full legal-style product name */
export const APP_NAME_FULL = "xStream Markets";

// Token definitions
export const TOKENS = {
  xSPY: {
    symbol: "xSPY",
    name: "Tokenized S&P 500 ETF",
    decimals: 18,
    description: "Tokenized SPY with dividend rebases",
  },
  xdSPY: {
    symbol: "xdSPY",
    name: "SPY Income Token",
    decimals: 18,
    description: "Dividend stream from xSPY. Accrues yield 24/7.",
  },
  xpSPY: {
    symbol: "xpSPY",
    name: "SPY Price Token",
    decimals: 18,
    description: "Pure price exposure to SPY. Leveraged day trading during NYSE hours.",
  },
} as const;

// NYSE session times (Eastern Standard Time)
export const SESSION = {
  OPEN_HOUR: 9,
  OPEN_MINUTE: 30,
  CLOSE_HOUR: 16,
  CLOSE_MINUTE: 0,
  TIMEZONE: "America/New_York",
} as const;

// Risk parameters (hackathon defaults from PRD)
export const RISK = {
  MAX_LEVERAGE: 3,
  LIQUIDATION_THRESHOLD: 1.1,
  BORROW_RATE_PER_HOUR: 0.0001, // 0.01% per hour
  MINT_BURN_FEE: 0.0005, // 0.05%
  SESSION_SETTLEMENT_FEE: 0.001, // 0.1% of notional
  LIQUIDATION_PENALTY: 0.05, // 5% of collateral
  LIQUIDATION_LIQUIDATOR_SHARE: 0.03, // 3% to liquidator
  LIQUIDATION_PROTOCOL_SHARE: 0.02, // 2% to protocol
  MIN_COLLATERAL_USDC: 100,
  PROTOCOL_FEE_SHARE: 0.2, // 20% to protocol treasury
  XD_HOLDER_FEE_SHARE: 0.8, // 80% to xdSPY holders
} as const;

// Market state machine
export enum MarketState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALT_L1 = "HALT_L1",
  HALT_L2 = "HALT_L2",
  HALT_L3 = "HALT_L3",
  SETTLING = "SETTLING",
}

// Circuit breaker triggers (S&P 500 drop from previous close)
export const CIRCUIT_BREAKERS = {
  L1: 0.07, // 7% drop
  L2: 0.13, // 13% drop
  L3: 0.2, // 20% drop
} as const;

// Projected APY breakdown for xdSPY
export const PROJECTED_APY = {
  DIVIDEND_REBASES: 0.013, // ~1.3%
  SESSION_BORROW_FEES: 0.125, // ~10-15% midpoint
  MINT_BURN_SPREAD: 0.0075, // ~0.5-1% midpoint
  TOTAL_LOW: 0.12, // ~12%
  TOTAL_HIGH: 0.16, // ~16%
} as const;
