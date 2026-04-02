# Market Page Contract Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the market detail page (`/app/markets/[ticker]`) to the deployed XStreamExchange and MarketKeeper contracts so users can open/close leveraged long/short positions, see real-time PnL, and have the order form gated by on-chain market status.

**Architecture:** A shared contract infrastructure layer (addresses, ABIs, hooks) sits in `web/lib/contracts/`. The market page consumes a `useExchange` hook for trading and a `useMarketStatus` hook for open/close gating. Position IDs are persisted in localStorage keyed by `account + chainId`. A `useTxFlow` hook standardizes all write-transaction UX (approving, pending, success, error). A prod/mock address toggle is provided via React context so the app works even when NYSE is closed.

**Tech Stack:** Next.js (app router), viem, Privy (wallet), Pyth Hermes (price feeds), Solidity contracts on Ink Sepolia / Eth Sepolia.

---

## File Structure

```
web/lib/contracts/
  addresses.ts          -- PROD/MOCK address configs, getContractConfig(), getAssetByTicker()
  abis/
    XStreamExchange.ts  -- Exchange ABI (extracted from foundry output)
    MarketKeeper.ts     -- MarketKeeper ABI
    ERC20.ts            -- Minimal ERC-20 ABI
    XStreamVault.ts     -- Vault ABI (for future vault integration)
  pyth.ts               -- fetchPythUpdateData() helper
  use-tx-flow.ts        -- useTxFlow() hook for transaction state machine
  use-exchange.ts       -- useExchange() hook (openLong, openShort, closeLong, closeShort, getPosition, getUnrealizedPnl)
  use-market-status.ts  -- useMarketStatus() hook (polls isMarketOpen)
  use-positions.ts      -- usePositions() hook (localStorage persistence + on-chain reads)
  use-erc20.ts          -- useErc20Balance(), ensureApproval() helpers
  contract-mode.tsx     -- ContractModeProvider context (prod/mock toggle)

web/app/app/
  layout.tsx            -- MODIFY: add ContractModeProvider + toggle in top bar
  markets/[ticker]/
    page.tsx            -- MODIFY: wire OrderForm to contract calls, populate positions table
```

---

### Task 1: Contract Address Registry

**Files:**
- Create: `web/lib/contracts/addresses.ts`
- Modify: `web/lib/contracts/config.ts` (update DEFAULT_CHAIN export, remove placeholder CONTRACTS)
- Modify: `web/lib/contracts/index.ts` (re-export new modules)

- [ ] **Step 1: Create `addresses.ts` with all deployment addresses**

```ts
// web/lib/contracts/addresses.ts
import { type Address } from "viem";

export interface AssetAddresses {
  symbol: string;
  ticker: string;
  xStock: Address;
  pxToken: Address;
  dxToken: Address;
  lpToken: Address;
  pythFeedId: `0x${string}`;
}

export interface ContractConfig {
  pythContract: Address;
  pythAdapter: Address;
  usdc: Address;
  vault: Address;
  exchange: Address;
  marketKeeper: Address;
  escrow: Address;
  assets: readonly AssetAddresses[];
}

export const PROD_INK_SEPOLIA: ContractConfig = {
  pythContract: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  pythAdapter:  "0xb26b353B4247f9db66175b333CDa74a7c068D341",
  usdc:         "0xC80EF19a1F4F49953B0383b411a74fd50f2ca361",
  vault:        "0x9e35DE19e3D7DB531C42fFc91Cc3a6F5Ba30B610",
  exchange:     "0x924eb79Bb78981Afa209E45aB3E50ee9d77D1D0F",
  marketKeeper: "0xcF0a135097b1CA2B21ADDeae20a883D9BACE1f74",
  escrow:       "0xC18288E58B79fAac72811dC1456515A88147e85a",
  assets: [
    { symbol: "TSLA", ticker: "TSLAxt", xStock: "0x9F64b176fEDF64a9A37ba58d372f3bd13B5F73b4", pxToken: "0x94461B0C10B371c9dE4DfFD1A08249e07c136d37", dxToken: "0x1FC97eAd7E36926bE30229762458C2B2aBB77d6F", lpToken: "0x6DfeBd1e56c26e055F3AD1FC3397EC7e68f8dD5C", pythFeedId: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1" },
    { symbol: "NVDA", ticker: "NVDAxt", xStock: "0xfeE1b917518EFa5c63C6baB841426F6A52b8581e", pxToken: "0xC1EFf33ba4fA5Ae036202Fe098030e59e078dd6D", dxToken: "0x12189923F13e0c2eD2c450189E7419E772281866", lpToken: "0x5b9D0DEE7CC10B4043E44F4EC1CE768c5c7cf745", pythFeedId: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593" },
    { symbol: "GOOGL", ticker: "GOOGLxt", xStock: "0x9eE3eb32dD9Da95Cd1D9C824701A1EcF9AE046B2", pxToken: "0x047BF5F5a416d1A0E8f98a99538CEb0c7bC9aD3B", dxToken: "0x7345c2917E2e6960C0dAc0A3079cc94b4246aC92", lpToken: "0xbc3f35De8571Ce748c82255CBA411b429572CfF8", pythFeedId: "0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6" },
    { symbol: "AAPL", ticker: "AAPLxt", xStock: "0x3e3885a7106107728afEF74A0000d90D3fA3cd1e", pxToken: "0x65abD57f02D23F774631778550b33f59cA4D300D", dxToken: "0xE7fF40cAB800a5E6DB733BF30D733777eE3285b5", lpToken: "0xEF7B7faF6d25E58925A523097d3888Bccba91F6e", pythFeedId: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688" },
    { symbol: "SPY", ticker: "SPYxt", xStock: "0xC16212b6840001f0a4382c3Da3c3f136C5b1cC31", pxToken: "0xC6555380D2E6AAA3Ca7d803a237d4c21e0e9D1a3", dxToken: "0x928dA312a5cDAc140C7cD18F8eCBCaeb73796B9f", lpToken: "0x01aA0e0Fa5623A16DF232ade97095B5919f9E183", pythFeedId: "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5" },
    { symbol: "TBLL", ticker: "TBLLxt", xStock: "0x06fdEB09bdCC13eCCC758b15DC81a45c839632d7", pxToken: "0x5e421FEAD3A1ad4A48843d1Eaea64Aa7d73a7F96", dxToken: "0x36ED5c732bA99a715e491F6601011D804ED6Fd6C", lpToken: "0x3119eDacE1c3b43e81F65F635c1E48Ef5F89409b", pythFeedId: "0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2" },
    { symbol: "GLD", ticker: "GLDxt", xStock: "0xedB61935572130a7946B7FA9A3EC788367047E4D", pxToken: "0xAd284878a45E75E8D8e5128573a708cFc99F9730", dxToken: "0x00e2675da5031dd4d107A092C34e8E01196c7cf9", lpToken: "0xf5B69cDF448BE6e7334823b085eBD50587Bd0E77", pythFeedId: "0x18bc5360b4a8d29fd8de4c7f9e40234440de7572c5ff74f0697f14d2afd5a820" },
    { symbol: "SLV", ticker: "SLVxt", xStock: "0x24A25fB43521D93AB57D1d57B0531fA5813a238c", pxToken: "0xD323e038Be2f630e9119c19AD152843b898902a0", dxToken: "0xeF7Dbea9B659EecD793AbD1b13c66431d6A695af", lpToken: "0xf2420295b1C1C9f9ee5a9277770e7df30abC3504", pythFeedId: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e" },
  ],
} as const;

export const PROD_ETH_SEPOLIA: ContractConfig = {
  pythContract: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  pythAdapter:  "0x04e32F127a2baEA28512Fa04F1dCD82e1Fdf3971",
  usdc:         "0xF2CE01ca6E39873a4d51cC40353Df309Ec424103",
  vault:        "0xb9DA59D8A25B15DFB6f7A02EB277ADCC34d8B5a8",
  exchange:     "0xEaB336258044846C5b9523967081BDC078C064d6",
  marketKeeper: "0xF382a19D4F3A8aD4288eE55CA363f47E91ceD563",
  escrow:       "0xC1481eE1f92053A778B6712d6F46e3BeaB339FD7",
  assets: [
    { symbol: "TSLA", ticker: "TSLAxt", xStock: "0x27c253BB83731D6323b3fb2B333DcF0C94b6031e", pxToken: "0x048F9f6B51E3cd6a0D421FDA035931d2bA695149", dxToken: "0x356469a8dF616AA8d16CA606A0b5426D740701Ae", lpToken: "0x591661b08147e34E911Ea2eBC005F009E6eE93B8", pythFeedId: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1" },
    { symbol: "NVDA", ticker: "NVDAxt", xStock: "0xaDfdf3EC7dC440931D363DA1D97b8Ee0479Dc409", pxToken: "0x0e318c4eBD5A01c5b2f2484151f6209cfdfd538a", dxToken: "0x9C41f79fB6D8856f4446c94BF307353064991163", lpToken: "0xB553Cdb7642d3C7ADbb202AFa3c626a5Fd7FF1A1", pythFeedId: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593" },
    { symbol: "GOOGL", ticker: "GOOGLxt", xStock: "0x8A36935c0F5137ceA736F28886ef8F480a1a1727", pxToken: "0xD94574363c0Bb7c99F27F32d104e98b974676cE9", dxToken: "0x0b64fed2D8b88603eF69B90EBaa549F54CE80831", lpToken: "0x72871F9b5Fc00225B25F8841a57b03419fF3bA72", pythFeedId: "0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6" },
    { symbol: "AAPL", ticker: "AAPLxt", xStock: "0x6DEfC6061Cafa52d96FAf60AE7A7D727a75C3Bdb", pxToken: "0x39f90Ec480F9FA4F18216b9847204bFA9AC38e7A", dxToken: "0xb8c41D20f2e73d4A425f0b97C219eBb0b6add321", lpToken: "0x2F0C60F95a10611E40F6717A6FDb9Eb5Cf1C7be5", pythFeedId: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688" },
    { symbol: "SPY", ticker: "SPYxt", xStock: "0x7312c657e8c73c09dD282c5E7cBdDf43ace25cFc", pxToken: "0xc8365cABDAa9A413bE023395813C48461fE97573", dxToken: "0x72fDEdCB8b086e07ac253437Fa3111101dcFA4f8", lpToken: "0x4e3159b26ba5Ca9521658c4D203f38472FC88Da9", pythFeedId: "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5" },
    { symbol: "TBLL", ticker: "TBLLxt", xStock: "0x6b4aDe3cAa2bEa98CEbe7019E09d69c23CD11C42", pxToken: "0x4b248fa6B6F62eA77A2666Ad8CfC9C16215B1e5A", dxToken: "0x3eC401F51Ca05BD2Aea4E2A28B96bfB463c7214B", lpToken: "0xFB80c2DD9c2880be70b3d43C5F0EFEa8E2ef1c21", pythFeedId: "0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2" },
    { symbol: "GLD", ticker: "GLDxt", xStock: "0xeae1f4476fDBD4FaED890568b1Cf69F372d72462", pxToken: "0xc8e614bF58F3b5b27A007Af826Bb00FF27a4c645", dxToken: "0xB8e66090d72e0Bb32e1A5aa8B7B104816b1889a8", lpToken: "0x93d02177AAb72Be67B4bc21821856F7E3ddb53F6", pythFeedId: "0x18bc5360b4a8d29fd8de4c7f9e40234440de7572c5ff74f0697f14d2afd5a820" },
    { symbol: "SLV", ticker: "SLVxt", xStock: "0x732C084288F3E7eF4D0b6Cdb6bdcbFd072DfEb92", pxToken: "0xf567a061Cd60F70510425E8Deb4eB8c8D67A7fb2", dxToken: "0x7e65fe690639a06c77ea2a89a99d1EdF58c8D0ba", lpToken: "0xf22071f7b7a3099702f5743FE88307BCCdc6f2C2", pythFeedId: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e" },
  ],
} as const;

export const MOCK_INK_SEPOLIA = {
  mockPyth:     "0x6C0602E1ef5F6a841ae61DF5A996d04BE7D21F6D" as Address,
  pythAdapter:  "0x73AA2f12E39110E5A2328F23Fc97ba0F024c13D6" as Address,
  usdc:         "0x0fE3321c5ACAE1ac8739978216F93AaE674EC1fE" as Address,
  vault:        "0xF0391bEACCA59d2a1A4A339af88dCDeAe210e6B6" as Address,
  exchange:     "0x859305A541536B1A2A3BFcaE05244DEAfdB1E167" as Address,
  marketKeeper: "0xC4E002Ab619C3C31b3Bc631b299e28e3D6C93CCa" as Address,
  escrow:       "0x662dc3B17696A688efd297D9DF5eFa4B21B607fB" as Address,
} as const;

export const MOCK_ETH_SEPOLIA = {
  mockPyth:     "0x16Ddd24738b05FC80989cbd2577F606962b65C31" as Address,
  pythAdapter:  "0x16eaB2D3E31Cc44D040Cf316141CD460F51DF50c" as Address,
  usdc:         "0x6913883E8c11829AC213760556F3C3b35148F296" as Address,
  vault:        "0xE7e63166543CEAE1d389e38f8b3faee8129cAfC2" as Address,
  exchange:     "0xDbfA9BBdfAb52DCB453105D70c5991d3D1C0E34D" as Address,
  marketKeeper: "0x9e5b98455102F21f47d6e0A6FC6a33f4c382aE51" as Address,
  escrow:       "0xb2131C8384599d95d2Cdd7733529Bfd7B3c68375" as Address,
} as const;

// Resolve config for the active chain.
// When contractMode is "mock", swap core addresses (exchange, vault, etc.) to mock deployment
// but keep the same asset token addresses (mock deployment uses same xStock/px/dx tokens).
export function getContractConfig(
  chainId: number,
  contractMode: "prod" | "mock" = "prod",
): ContractConfig {
  if (contractMode === "mock") {
    const mock = chainId === 763373 ? MOCK_INK_SEPOLIA : MOCK_ETH_SEPOLIA;
    const prod = chainId === 763373 ? PROD_INK_SEPOLIA : PROD_ETH_SEPOLIA;
    return {
      pythContract: mock.mockPyth,
      pythAdapter:  mock.pythAdapter,
      usdc:         mock.usdc,
      vault:        mock.vault,
      exchange:     mock.exchange,
      marketKeeper: mock.marketKeeper,
      escrow:       mock.escrow,
      assets:       prod.assets, // token addresses stay the same
    };
  }
  switch (chainId) {
    case 763373:   return PROD_INK_SEPOLIA;
    case 11155111: return PROD_ETH_SEPOLIA;
    default:       throw new Error(`Unsupported chain: ${chainId}`);
  }
}

export function getAssetByTicker(cfg: ContractConfig, ticker: string) {
  return cfg.assets.find((a) => a.ticker === ticker) ?? null;
}
```

- [ ] **Step 2: Update `config.ts` to re-export DEFAULT_CHAIN only**

Replace entire contents of `web/lib/contracts/config.ts`:

```ts
import { inkSepolia } from "viem/chains";

export const DEFAULT_CHAIN = inkSepolia;
```

- [ ] **Step 3: Update `index.ts` to export new modules**

Replace entire contents of `web/lib/contracts/index.ts`:

```ts
export { getPublicClient, getWalletClient } from "./client";
export { useContractRead, useContractWrite } from "./useContract";
export { DEFAULT_CHAIN } from "./config";
export {
  getContractConfig,
  getAssetByTicker,
  PROD_INK_SEPOLIA,
  PROD_ETH_SEPOLIA,
  type ContractConfig,
  type AssetAddresses,
} from "./addresses";
```

- [ ] **Step 4: Verify the app still compiles**

Run: `cd web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (no runtime code changed, just new exports)

- [ ] **Step 5: Commit**

```bash
git add web/lib/contracts/addresses.ts web/lib/contracts/config.ts web/lib/contracts/index.ts
git commit -m "feat: add contract address registry for prod and mock deployments"
```

---

### Task 2: ABI Files

**Files:**
- Create: `web/lib/contracts/abis/ERC20.ts`
- Create: `web/lib/contracts/abis/XStreamExchange.ts`
- Create: `web/lib/contracts/abis/MarketKeeper.ts`

- [ ] **Step 1: Create minimal ERC-20 ABI**

```ts
// web/lib/contracts/abis/ERC20.ts
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
] as const;
```

- [ ] **Step 2: Create XStreamExchange ABI (trading functions only)**

Extract from `contracts/out/XStreamExchange.sol/XStreamExchange.json`. Only include functions the frontend needs:

```ts
// web/lib/contracts/abis/XStreamExchange.ts
export const EXCHANGE_ABI = [
  {
    name: "openLong",
    type: "function",
    inputs: [
      { name: "pxToken", type: "address" },
      { name: "collateral", type: "uint256" },
      { name: "leverage", type: "uint256" },
      { name: "pythUpdateData", type: "bytes[]" },
    ],
    outputs: [{ name: "positionId", type: "bytes32" }],
    stateMutability: "payable",
  },
  {
    name: "openShort",
    type: "function",
    inputs: [
      { name: "pxToken", type: "address" },
      { name: "collateral", type: "uint256" },
      { name: "leverage", type: "uint256" },
      { name: "pythUpdateData", type: "bytes[]" },
    ],
    outputs: [{ name: "positionId", type: "bytes32" }],
    stateMutability: "payable",
  },
  {
    name: "closeLong",
    type: "function",
    inputs: [
      { name: "positionId", type: "bytes32" },
      { name: "pythUpdateData", type: "bytes[]" },
    ],
    outputs: [{ name: "pnl", type: "int256" }],
    stateMutability: "payable",
  },
  {
    name: "closeShort",
    type: "function",
    inputs: [
      { name: "positionId", type: "bytes32" },
      { name: "pythUpdateData", type: "bytes[]" },
    ],
    outputs: [{ name: "pnl", type: "int256" }],
    stateMutability: "payable",
  },
  {
    name: "getPosition",
    type: "function",
    inputs: [{ name: "positionId", type: "bytes32" }],
    outputs: [
      { name: "trader", type: "address" },
      { name: "pxToken", type: "address" },
      { name: "isLong", type: "bool" },
      { name: "collateral", type: "uint256" },
      { name: "notional", type: "uint256" },
      { name: "entryPrice", type: "uint256" },
      { name: "openedAt", type: "uint256" },
      { name: "borrowAccumulator", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    name: "getUnrealizedPnl",
    type: "function",
    inputs: [
      { name: "positionId", type: "bytes32" },
      { name: "pythUpdateData", type: "bytes[]" },
    ],
    outputs: [
      { name: "pnl", type: "int256" },
      { name: "collateralRemaining", type: "uint256" },
      { name: "isLiquidatable", type: "bool" },
    ],
    stateMutability: "payable",
  },
  {
    name: "marketOpen",
    type: "function",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "getPoolConfig",
    type: "function",
    inputs: [{ name: "pxToken", type: "address" }],
    outputs: [
      { name: "", type: "tuple", components: [
        { name: "xStock", type: "address" },
        { name: "pythFeedId", type: "bytes32" },
        { name: "totalLiquidity", type: "uint256" },
        { name: "totalBorrowed", type: "uint256" },
        { name: "lpTotalSupply", type: "uint256" },
        { name: "borrowAccumulator", type: "uint256" },
        { name: "lastAccrualTime", type: "uint256" },
        { name: "lpToken", type: "address" },
        { name: "maxLeverage", type: "uint256" },
      ]},
    ],
    stateMutability: "view",
  },
  {
    name: "usdc",
    type: "function",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    name: "TRADING_FEE_BPS",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "getOpenPositionCount",
    type: "function",
    inputs: [{ name: "pxToken", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  // Events needed for parsing tx receipts
  {
    name: "PositionOpened",
    type: "event",
    inputs: [
      { name: "positionId", type: "bytes32", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "pxToken", type: "address", indexed: false },
      { name: "isLong", type: "bool", indexed: false },
      { name: "collateral", type: "uint256", indexed: false },
      { name: "notional", type: "uint256", indexed: false },
      { name: "entryPrice", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PositionClosed",
    type: "event",
    inputs: [
      { name: "positionId", type: "bytes32", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "pnl", type: "int256", indexed: false },
    ],
  },
] as const;
```

- [ ] **Step 3: Create MarketKeeper ABI**

```ts
// web/lib/contracts/abis/MarketKeeper.ts
export const MARKET_KEEPER_ABI = [
  {
    name: "isMarketOpen",
    type: "function",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;
```

- [ ] **Step 4: Commit**

```bash
git add web/lib/contracts/abis/
git commit -m "feat: add ABI files for Exchange, MarketKeeper, and ERC20"
```

---

### Task 3: Pyth Update Data Helper

**Files:**
- Create: `web/lib/contracts/pyth.ts`

- [ ] **Step 1: Create `pyth.ts`**

```ts
// web/lib/contracts/pyth.ts
import { type PublicClient, type Address } from "viem";

const HERMES = "https://hermes.pyth.network";

const GET_UPDATE_FEE_ABI = [
  {
    name: "getUpdateFee",
    type: "function",
    inputs: [{ name: "updateData", type: "bytes[]" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function fetchPythUpdateData(
  feedIds: string[],
  pythContract: Address,
  publicClient: PublicClient,
): Promise<{ updateData: `0x${string}`[]; fee: bigint }> {
  const params = feedIds.map((id) => `ids[]=${id}`).join("&");
  const res = await fetch(
    `${HERMES}/v2/updates/price/latest?${params}&encoding=hex&parsed=true`,
  );
  const json = await res.json();

  const updateData: `0x${string}`[] = json.binary.data.map(
    (d: string) => `0x${d}` as `0x${string}`,
  );

  const fee = await publicClient.readContract({
    address: pythContract,
    abi: GET_UPDATE_FEE_ABI,
    functionName: "getUpdateFee",
    args: [updateData],
  });

  return { updateData, fee };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/contracts/pyth.ts
git commit -m "feat: add Pyth update data fetch helper"
```

---

### Task 4: Contract Mode Context (Prod/Mock Toggle)

**Files:**
- Create: `web/lib/contracts/contract-mode.tsx`
- Modify: `web/app/app/layout.tsx` (wrap with provider, add toggle in top bar)

- [ ] **Step 1: Create ContractModeProvider**

```tsx
// web/lib/contracts/contract-mode.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type ContractMode = "prod" | "mock";

type ContractModeContextValue = {
  contractMode: ContractMode;
  setContractMode: (m: ContractMode) => void;
  isProd: boolean;
  isMock: boolean;
};

const ContractModeContext = createContext<ContractModeContextValue | null>(null);

const STORAGE_KEY = "xstream_contract_mode";

export function ContractModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ContractMode>("prod");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "prod" || stored === "mock") {
        setModeState(stored);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function setContractMode(m: ContractMode) {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // ignore
    }
  }

  const value: ContractModeContextValue = {
    contractMode: mode,
    setContractMode,
    isProd: mode === "prod",
    isMock: mode === "mock",
  };

  if (!hydrated) return null;

  return (
    <ContractModeContext.Provider value={value}>
      {children}
    </ContractModeContext.Provider>
  );
}

export function useContractMode() {
  const ctx = useContext(ContractModeContext);
  if (!ctx)
    throw new Error("useContractMode must be used within ContractModeProvider");
  return ctx;
}
```

- [ ] **Step 2: Add ContractModeProvider to AppLayout and add toggle in top bar**

In `web/app/app/layout.tsx`:

1. Import at the top:
```ts
import { ContractModeProvider, useContractMode } from "@/lib/contracts/contract-mode";
```

2. Create a `ContractModeToggle` component (add after the existing `ModeToggle` component):
```tsx
function ContractModeToggle() {
  const { contractMode, setContractMode, isMock } = useContractMode();

  return (
    <div
      onClick={() => setContractMode(isMock ? "prod" : "mock")}
      className="relative flex items-center h-7 w-[100px] rounded-full bg-[#eee] border border-black/[0.07] cursor-pointer select-none overflow-hidden"
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
```

3. In the `<header>` of `AppLayoutInner` (around line 406), add the toggle right after the session status indicator:
```tsx
{/* existing session status */}
<div className="flex shrink-0 items-center gap-2">
  <Circle className={`size-2 fill-current ${session.open ? "text-green-500" : "text-red-500"}`} />
  <span className={`text-xs font-medium ${session.open ? "text-green-500" : "text-red-500"}`}>
    {session.label}
  </span>
</div>

{/* NEW: contract mode toggle */}
<ContractModeToggle />
```

4. Wrap the `AppLayoutInner` children in `ContractModeProvider`:
In the `AppLayout` component at the bottom, update:
```tsx
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
```

- [ ] **Step 3: Verify the toggle renders**

Run: `cd web && npx next dev`
Navigate to `/app/markets`. Confirm the Prod/Mock toggle appears in the top bar next to the NYSE OPEN/CLOSED indicator.

- [ ] **Step 4: Commit**

```bash
git add web/lib/contracts/contract-mode.tsx web/app/app/layout.tsx
git commit -m "feat: add prod/mock contract mode toggle in app top bar"
```

---

### Task 5: Transaction Flow Hook

**Files:**
- Create: `web/lib/contracts/use-tx-flow.ts`

- [ ] **Step 1: Create `use-tx-flow.ts`**

```ts
// web/lib/contracts/use-tx-flow.ts
"use client";

import { useState, useCallback, useRef } from "react";

export type TxState = "idle" | "approving" | "pending" | "success" | "error";

export function useTxFlow() {
  const [state, setState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setError(null);
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const execute = useCallback(
    async (fn: () => Promise<{ transactionHash: string }>) => {
      reset();
      setState("pending");
      try {
        const receipt = await fn();
        setTxHash(receipt.transactionHash);
        setState("success");
        // Auto-reset after 3 seconds
        resetTimer.current = setTimeout(() => setState("idle"), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Transaction failed");
        setState("error");
      }
    },
    [reset],
  );

  return { state, txHash, error, execute, reset, setState };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/contracts/use-tx-flow.ts
git commit -m "feat: add useTxFlow hook for transaction state management"
```

---

### Task 6: ERC-20 Helpers

**Files:**
- Create: `web/lib/contracts/use-erc20.ts`

- [ ] **Step 1: Create `use-erc20.ts`**

```ts
// web/lib/contracts/use-erc20.ts
"use client";

import { useState, useCallback } from "react";
import {
  type Address,
  type PublicClient,
  type WalletClient,
  getContract,
  formatUnits,
} from "viem";
import { ERC20_ABI } from "./abis/ERC20";

export function getErc20Contract(
  address: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
) {
  return getContract({
    address,
    abi: ERC20_ABI,
    client: walletClient
      ? { public: publicClient, wallet: walletClient }
      : { public: publicClient },
  });
}

export async function ensureApproval(
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
  account: Address,
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<void> {
  const token = getErc20Contract(tokenAddress, publicClient, walletClient);
  const current = await token.read.allowance([account, spender]);
  if (current < amount) {
    const hash = await token.write.approve([spender, amount], { account });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

export function useErc20Balance(
  tokenAddress: Address | undefined,
  account: Address | undefined,
  publicClient: PublicClient | null,
  decimals: number = 18,
) {
  const [balance, setBalance] = useState<string>("0");
  const [rawBalance, setRawBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tokenAddress || !account || !publicClient) return;
    setLoading(true);
    try {
      const token = getErc20Contract(tokenAddress, publicClient);
      const raw = await token.read.balanceOf([account]);
      setRawBalance(raw);
      setBalance(formatUnits(raw, decimals));
    } catch {
      // ignore read errors
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, account, publicClient, decimals]);

  return { balance, rawBalance, loading, refresh };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/contracts/use-erc20.ts
git commit -m "feat: add ERC-20 approval and balance helpers"
```

---

### Task 7: Market Status Hook

**Files:**
- Create: `web/lib/contracts/use-market-status.ts`

- [ ] **Step 1: Create `use-market-status.ts`**

This hook polls `MarketKeeper.isMarketOpen()` every 60 seconds and replaces the client-side UTC time check currently in `useSessionStatus` in `layout.tsx`.

```ts
// web/lib/contracts/use-market-status.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { type PublicClient, type Address } from "viem";
import { MARKET_KEEPER_ABI } from "./abis/MarketKeeper";

export function useMarketStatus(
  publicClient: PublicClient | null,
  marketKeeperAddress: Address | undefined,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!publicClient || !marketKeeperAddress) {
      setLoading(false);
      return;
    }
    try {
      const open = await publicClient.readContract({
        address: marketKeeperAddress,
        abi: MARKET_KEEPER_ABI,
        functionName: "isMarketOpen",
      });
      setIsOpen(open as boolean);
    } catch {
      // If the call fails, fall back to closed
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, [publicClient, marketKeeperAddress]);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  return { isOpen, loading, refresh: check };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/contracts/use-market-status.ts
git commit -m "feat: add useMarketStatus hook polling MarketKeeper contract"
```

---

### Task 8: Position Storage & Reading Hook

**Files:**
- Create: `web/lib/contracts/use-positions.ts`

- [ ] **Step 1: Create `use-positions.ts`**

Position IDs are stored in localStorage keyed by `account + chainId`. The hook reads on-chain position data and unrealized PnL.

```ts
// web/lib/contracts/use-positions.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type PublicClient,
  type Address,
  formatUnits,
} from "viem";
import { EXCHANGE_ABI } from "./abis/XStreamExchange";
import { fetchPythUpdateData } from "./pyth";
import { type ContractConfig, type AssetAddresses } from "./addresses";

export interface StoredPosition {
  positionId: `0x${string}`;
  ticker: string;
  isLong: boolean;
  openedAt: number; // unix timestamp
}

export interface PositionWithPnl extends StoredPosition {
  trader: Address;
  pxToken: Address;
  collateral: string; // formatted USDC
  notional: string;   // formatted USDC
  entryPrice: number; // USD
  pnl: string;        // formatted USDC
  collateralRemaining: string;
  isLiquidatable: boolean;
  leverage: number;
}

function storageKey(account: Address, chainId: number) {
  return `xstream_positions_${account.toLowerCase()}_${chainId}`;
}

function loadPositions(account: Address, chainId: number): StoredPosition[] {
  try {
    const raw = localStorage.getItem(storageKey(account, chainId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePositions(
  account: Address,
  chainId: number,
  positions: StoredPosition[],
) {
  try {
    localStorage.setItem(
      storageKey(account, chainId),
      JSON.stringify(positions),
    );
  } catch {
    // ignore
  }
}

export function usePositions(
  account: Address | undefined,
  chainId: number | undefined,
  publicClient: PublicClient | null,
  cfg: ContractConfig | null,
) {
  const [stored, setStored] = useState<StoredPosition[]>([]);
  const [positions, setPositions] = useState<PositionWithPnl[]>([]);
  const [loading, setLoading] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (!account || !chainId) return;
    setStored(loadPositions(account, chainId));
  }, [account, chainId]);

  // Add a new position (called after openLong/openShort)
  const addPosition = useCallback(
    (pos: StoredPosition) => {
      if (!account || !chainId) return;
      const updated = [...stored, pos];
      setStored(updated);
      savePositions(account, chainId, updated);
    },
    [account, chainId, stored],
  );

  // Remove a position (called after close)
  const removePosition = useCallback(
    (positionId: `0x${string}`) => {
      if (!account || !chainId) return;
      const updated = stored.filter((p) => p.positionId !== positionId);
      setStored(updated);
      savePositions(account, chainId, updated);
    },
    [account, chainId, stored],
  );

  // Fetch on-chain data for all stored positions
  const refreshPositions = useCallback(async () => {
    if (!publicClient || !cfg || stored.length === 0) {
      setPositions([]);
      return;
    }
    setLoading(true);
    try {
      const results: PositionWithPnl[] = [];

      for (const sp of stored) {
        try {
          const pos = await publicClient.readContract({
            address: cfg.exchange,
            abi: EXCHANGE_ABI,
            functionName: "getPosition",
            args: [sp.positionId],
          }) as [Address, Address, boolean, bigint, bigint, bigint, bigint, bigint];

          const [trader, pxToken, isLong, collateral, notional, entryPrice] = pos;

          // Skip positions that have been closed (trader = zero address)
          if (trader === "0x0000000000000000000000000000000000000000") {
            removePosition(sp.positionId);
            continue;
          }

          // Find the asset to get pythFeedId
          const asset = cfg.assets.find(
            (a) => a.pxToken.toLowerCase() === pxToken.toLowerCase(),
          );
          if (!asset) continue;

          // Fetch unrealized PnL
          const { updateData, fee } = await fetchPythUpdateData(
            [asset.pythFeedId],
            cfg.pythContract,
            publicClient,
          );

          const pnlResult = await publicClient.readContract({
            address: cfg.exchange,
            abi: EXCHANGE_ABI,
            functionName: "getUnrealizedPnl",
            args: [sp.positionId, updateData],
            value: fee,
          }) as [bigint, bigint, boolean];

          const [pnl, collateralRemaining, isLiquidatable] = pnlResult;
          const leverageNum =
            Number(notional) / Number(collateral) || 1;

          results.push({
            ...sp,
            trader,
            pxToken,
            isLong,
            collateral: formatUnits(collateral, 6),
            notional: formatUnits(notional, 6),
            entryPrice: Number(entryPrice) / 1e8,
            pnl: formatUnits(pnl, 6),
            collateralRemaining: formatUnits(collateralRemaining, 6),
            isLiquidatable,
            leverage: Math.round(leverageNum * 10) / 10,
          });
        } catch {
          // Skip positions that fail to read (may have been liquidated)
          continue;
        }
      }

      setPositions(results);
    } finally {
      setLoading(false);
    }
  }, [publicClient, cfg, stored, removePosition]);

  return {
    stored,
    positions,
    loading,
    addPosition,
    removePosition,
    refreshPositions,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/contracts/use-positions.ts
git commit -m "feat: add usePositions hook with localStorage persistence and on-chain PnL"
```

---

### Task 9: Exchange Hook (openLong, openShort, closeLong, closeShort)

**Files:**
- Create: `web/lib/contracts/use-exchange.ts`

- [ ] **Step 1: Create `use-exchange.ts`**

```ts
// web/lib/contracts/use-exchange.ts
"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  decodeEventLog,
  type Address,
} from "viem";
import { inkSepolia, sepolia } from "viem/chains";
import { useContractMode } from "./contract-mode";
import { getContractConfig, getAssetByTicker } from "./addresses";
import { EXCHANGE_ABI } from "./abis/XStreamExchange";
import { fetchPythUpdateData } from "./pyth";
import { ensureApproval } from "./use-erc20";

function useClients() {
  const { wallets } = useWallets();
  const wallet = wallets[0];

  if (!wallet) return { publicClient: null, walletClient: null, account: undefined, chainId: undefined };

  const chainIdNum = parseInt(wallet.chainId.split(":")[1]);
  const chain = chainIdNum === 763373 ? inkSepolia : sepolia;

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({
    chain,
    transport: custom(wallet.getEthereumProvider()),
  });

  return {
    publicClient,
    walletClient,
    account: wallet.address as Address,
    chainId: chainIdNum,
  };
}

export function useExchange() {
  const { publicClient, walletClient, account, chainId } = useClients();
  const { contractMode } = useContractMode();

  const cfg = chainId ? getContractConfig(chainId, contractMode) : null;

  const openLong = useCallback(
    async (ticker: string, collateralUsdc: string, leverage: number) => {
      if (!publicClient || !walletClient || !account || !cfg)
        throw new Error("Wallet not connected");

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const rawCollateral = parseUnits(collateralUsdc, 6);
      const rawLeverage = BigInt(Math.floor(leverage * 1e18));

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract,
        publicClient,
      );

      await ensureApproval(
        cfg.usdc,
        cfg.exchange,
        rawCollateral,
        account,
        publicClient,
        walletClient,
      );

      const hash = await walletClient.writeContract({
        address: cfg.exchange,
        abi: EXCHANGE_ABI,
        functionName: "openLong",
        args: [asset.pxToken, rawCollateral, rawLeverage, updateData],
        account,
        value: fee,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Decode positionId from PositionOpened event
      const positionEvent = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: EXCHANGE_ABI,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((e) => e?.eventName === "PositionOpened");

      const positionId = positionEvent?.args
        ? (positionEvent.args as { positionId: `0x${string}` }).positionId
        : null;

      return { receipt, positionId };
    },
    [publicClient, walletClient, account, cfg],
  );

  const openShort = useCallback(
    async (ticker: string, collateralUsdc: string, leverage: number) => {
      if (!publicClient || !walletClient || !account || !cfg)
        throw new Error("Wallet not connected");

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const rawCollateral = parseUnits(collateralUsdc, 6);
      const rawLeverage = BigInt(Math.floor(leverage * 1e18));

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract,
        publicClient,
      );

      await ensureApproval(
        cfg.usdc,
        cfg.exchange,
        rawCollateral,
        account,
        publicClient,
        walletClient,
      );

      const hash = await walletClient.writeContract({
        address: cfg.exchange,
        abi: EXCHANGE_ABI,
        functionName: "openShort",
        args: [asset.pxToken, rawCollateral, rawLeverage, updateData],
        account,
        value: fee,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const positionEvent = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: EXCHANGE_ABI,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((e) => e?.eventName === "PositionOpened");

      const positionId = positionEvent?.args
        ? (positionEvent.args as { positionId: `0x${string}` }).positionId
        : null;

      return { receipt, positionId };
    },
    [publicClient, walletClient, account, cfg],
  );

  const closeLong = useCallback(
    async (positionId: `0x${string}`, ticker: string) => {
      if (!publicClient || !walletClient || !account || !cfg)
        throw new Error("Wallet not connected");

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract,
        publicClient,
      );

      const hash = await walletClient.writeContract({
        address: cfg.exchange,
        abi: EXCHANGE_ABI,
        functionName: "closeLong",
        args: [positionId, updateData],
        account,
        value: fee,
      });

      return publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient, walletClient, account, cfg],
  );

  const closeShort = useCallback(
    async (positionId: `0x${string}`, ticker: string) => {
      if (!publicClient || !walletClient || !account || !cfg)
        throw new Error("Wallet not connected");

      const asset = getAssetByTicker(cfg, ticker);
      if (!asset) throw new Error(`Asset not found: ${ticker}`);

      const { updateData, fee } = await fetchPythUpdateData(
        [asset.pythFeedId],
        cfg.pythContract,
        publicClient,
      );

      const hash = await walletClient.writeContract({
        address: cfg.exchange,
        abi: EXCHANGE_ABI,
        functionName: "closeShort",
        args: [positionId, updateData],
        account,
        value: fee,
      });

      return publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient, walletClient, account, cfg],
  );

  return {
    openLong,
    openShort,
    closeLong,
    closeShort,
    account,
    chainId,
    cfg,
    publicClient,
    connected: !!account,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/contracts/use-exchange.ts
git commit -m "feat: add useExchange hook for opening and closing positions"
```

---

### Task 10: Wire OrderForm to Contract Calls

**Files:**
- Modify: `web/app/app/markets/[ticker]/page.tsx`

This is the core integration. The `OrderForm` component needs to:
1. Call `useExchange()` for trading
2. Call `useMarketStatus()` to gate the Long/Short buttons
3. Call `useTxFlow()` to manage button states
4. Call `usePositions()` to persist and display positions
5. Show USDC balance from `useErc20Balance()`

- [ ] **Step 1: Add imports at the top of `page.tsx`**

Add these imports after the existing imports in `web/app/app/markets/[ticker]/page.tsx`:

```ts
import { useExchange } from "@/lib/contracts/use-exchange";
import { useMarketStatus } from "@/lib/contracts/use-market-status";
import { usePositions, type PositionWithPnl } from "@/lib/contracts/use-positions";
import { useTxFlow, type TxState } from "@/lib/contracts/use-tx-flow";
import { useErc20Balance } from "@/lib/contracts/use-erc20";
import { useContractMode } from "@/lib/contracts/contract-mode";
import { getContractConfig } from "@/lib/contracts/addresses";
import { getPublicClient } from "@/lib/contracts/client";
import { formatUnits } from "viem";
```

- [ ] **Step 2: Update the OrderForm component to accept and use contract hooks**

Replace the `OrderForm` function signature and body. Key changes:
- Accept `onPositionOpened` callback
- Use `useTxFlow` for button states
- Call `exchange.openLong` / `exchange.openShort` on submit
- Show USDC balance
- Disable buttons when market is closed

```tsx
function OrderForm({
  asset,
  stopLoss,
  onStopLossChange,
  marketOpen,
  onPositionOpened,
}: {
  asset: Asset;
  stopLoss: number | null;
  onStopLossChange: (v: number | null) => void;
  marketOpen: boolean;
  onPositionOpened?: () => void;
}) {
  const [tab, setTab] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [payAmount, setPayAmount] = useState("");
  const [leverage, setLeverage] = useState(25);
  const [stopLossEnabled, setStopLossEnabled] = useState(false);

  const exchange = useExchange();
  const { state: txState, error: txError, execute, reset: resetTx } = useTxFlow();

  // USDC balance
  const publicClient = exchange.publicClient ?? null;
  const { balance: usdcBalance, refresh: refreshBalance } = useErc20Balance(
    exchange.cfg?.usdc,
    exchange.account,
    publicClient,
    6,
  );

  // Refresh balance on mount and after successful tx
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    if (txState === "success") refreshBalance();
  }, [txState, refreshBalance]);

  const payNum = parseFloat(payAmount) || 0;
  const positionSize = payNum * leverage;
  const positive = asset.change >= 0;

  const handleStopLossToggle = () => {
    if (stopLossEnabled) {
      setStopLossEnabled(false);
      onStopLossChange(null);
    } else {
      setStopLossEnabled(true);
      const defaultSL =
        tab === "long" ? asset.price * 0.95 : asset.price * 1.05;
      onStopLossChange(Math.round(defaultSL * 100) / 100);
    }
  };

  const handleSubmit = async () => {
    if (payNum <= 0 || !exchange.connected) return;

    await execute(async () => {
      const result = tab === "long"
        ? await exchange.openLong(asset.ticker, payAmount, leverage)
        : await exchange.openShort(asset.ticker, payAmount, leverage);

      if (onPositionOpened) onPositionOpened();

      return { transactionHash: result.receipt.transactionHash };
    });
  };

  // Button label based on tx state
  const buttonLabel = (() => {
    switch (txState) {
      case "approving": return "Approving...";
      case "pending":   return "Confirming...";
      case "success":   return "Done!";
      case "error":     return "Try Again";
      default:
        if (!exchange.connected) return "Connect Wallet";
        if (!marketOpen) return "Market Closed";
        return `${tab === "long" ? "Long" : "Short"} ${asset.symbol}/USD`;
    }
  })();

  const disabled =
    payNum <= 0 ||
    !exchange.connected ||
    !marketOpen ||
    txState === "pending" ||
    txState === "approving";

  // ... rest of the JSX stays the same, but update:
  // 1. The USDC balance display
  // 2. The button
  // See Step 3 for the specific JSX changes.
```

- [ ] **Step 3: Update the JSX in OrderForm**

In the Pay input section, replace the hardcoded balance:
```tsx
{/* old: <p className="text-xs text-muted-foreground">${payNum.toFixed(2)}</p> */}
<p className="text-xs text-muted-foreground">
  Balance: {parseFloat(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
</p>
```

Replace the submit button:
```tsx
<Button
  className={`w-full h-11 font-medium text-sm ${
    tab === "long"
      ? "bg-primary text-primary-foreground hover:bg-primary/80"
      : "bg-red-500 text-white hover:bg-red-600"
  }`}
  disabled={disabled}
  onClick={handleSubmit}
>
  {buttonLabel}
</Button>

{/* Show error message */}
{txState === "error" && txError && (
  <p className="text-xs text-red-500 mt-2 text-center">{txError}</p>
)}

{/* Show tx hash on success */}
{txState === "success" && (
  <p className="text-xs text-green-500 mt-2 text-center">
    Position opened successfully!
  </p>
)}
```

- [ ] **Step 4: Update ExpertDetail to pass marketOpen and wire positions**

In the `ExpertDetail` component, add the hooks:

```tsx
function ExpertDetail({ asset }: { asset: Asset }) {
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState("5m");

  const { contractMode } = useContractMode();
  const exchange = useExchange();
  const chainId = exchange.chainId ?? 763373;
  const cfg = exchange.cfg;
  const publicClient = exchange.publicClient ?? getPublicClient();

  const { isOpen: marketOpen, loading: marketLoading } = useMarketStatus(
    publicClient,
    cfg?.marketKeeper,
  );

  const {
    positions,
    loading: positionsLoading,
    addPosition,
    removePosition,
    refreshPositions,
  } = usePositions(exchange.account, chainId, publicClient, cfg ?? null);

  // Refresh positions on mount and every 30s
  useEffect(() => {
    refreshPositions();
    const id = setInterval(refreshPositions, 30_000);
    return () => clearInterval(id);
  }, [refreshPositions]);

  const { candles, loading: candlesLoading } = usePythCandles(
    asset.symbol,
    asset.pythFeedId,
    timeframe,
  );
  // ... rest stays the same
```

Update the `OrderForm` usage:
```tsx
<OrderForm
  asset={asset}
  stopLoss={stopLoss}
  onStopLossChange={setStopLoss}
  marketOpen={marketOpen}
  onPositionOpened={refreshPositions}
/>
```

- [ ] **Step 5: Add market closed banner**

In `ExpertDetail`, right after the top bar div and before the main 2-panel layout, add:

```tsx
{!marketOpen && !marketLoading && (
  <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-500 font-medium">
    <Circle className="size-2 fill-current" />
    Market is closed. Trading is disabled. {contractMode === "prod" ? "Switch to Mock mode to test." : ""}
  </div>
)}
```

- [ ] **Step 6: Populate the Positions table with real data**

Replace the empty positions table body with:

```tsx
<TabsContent value="positions" className="px-4 pb-4">
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="text-muted-foreground border-b border-border/50">
          <th className="text-left py-2 font-medium">Position</th>
          <th className="text-right py-2 font-medium">Size</th>
          <th className="text-right py-2 font-medium">Leverage</th>
          <th className="text-right py-2 font-medium">Entry Price</th>
          <th className="text-right py-2 font-medium">Mark Price</th>
          <th className="text-right py-2 font-medium">PNL</th>
          <th className="text-right py-2 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {positionsLoading ? (
          <tr>
            <td colSpan={7} className="text-center py-8 text-muted-foreground">
              Loading positions...
            </td>
          </tr>
        ) : positions.length === 0 ? (
          <tr>
            <td colSpan={7} className="text-center py-8 text-muted-foreground">
              No open positions
            </td>
          </tr>
        ) : (
          positions.map((pos) => (
            <PositionRow
              key={pos.positionId}
              position={pos}
              currentPrice={asset.price}
              onClose={async () => {
                const fn = pos.isLong
                  ? exchange.closeLong
                  : exchange.closeShort;
                await fn(pos.positionId, pos.ticker);
                removePosition(pos.positionId);
                refreshPositions();
              }}
            />
          ))
        )}
      </tbody>
    </table>
  </div>
</TabsContent>
```

- [ ] **Step 7: Add PositionRow component**

Add this component above `ExpertDetail`:

```tsx
function PositionRow({
  position,
  currentPrice,
  onClose,
}: {
  position: PositionWithPnl;
  currentPrice: number;
  onClose: () => Promise<void>;
}) {
  const [closing, setClosing] = useState(false);
  const pnlNum = parseFloat(position.pnl);
  const pnlPositive = pnlNum >= 0;

  const handleClose = async () => {
    setClosing(true);
    try {
      await onClose();
    } catch {
      // ignore -- error shown elsewhere
    } finally {
      setClosing(false);
    }
  };

  return (
    <tr className="border-b border-border/30 hover:bg-muted/20">
      <td className="py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            position.isLong
              ? "bg-primary/10 text-primary"
              : "bg-red-500/10 text-red-500"
          }`}>
            {position.isLong ? "LONG" : "SHORT"}
          </span>
          <span className="font-medium">{position.ticker}</span>
        </div>
      </td>
      <td className="text-right py-2.5 font-mono">
        ${parseFloat(position.notional).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="text-right py-2.5">{position.leverage}x</td>
      <td className="text-right py-2.5 font-mono">
        ${position.entryPrice.toFixed(2)}
      </td>
      <td className="text-right py-2.5 font-mono">
        ${currentPrice.toFixed(2)}
      </td>
      <td className={`text-right py-2.5 font-mono font-medium ${pnlPositive ? "text-primary" : "text-red-500"}`}>
        {pnlPositive ? "+" : ""}${pnlNum.toFixed(2)}
      </td>
      <td className="text-right py-2.5">
        <button
          onClick={handleClose}
          disabled={closing}
          className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
        >
          {closing ? "Closing..." : "Close"}
        </button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 8: Add missing `useEffect` import if not present and `useState` for PositionRow**

The file already imports `useState` from react. Verify `useEffect` is also imported. If not, add it to the existing import line:

```ts
import { use, useState, useEffect } from "react";
```

- [ ] **Step 9: Verify the page compiles**

Run: `cd web && npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
git add web/app/app/markets/\[ticker\]/page.tsx
git commit -m "feat: wire market detail page to XStreamExchange contracts"
```

---

### Task 11: Update Positions Tab Counts

**Files:**
- Modify: `web/app/app/markets/[ticker]/page.tsx`

- [ ] **Step 1: Update the tab labels to show live counts**

In the `ExpertDetail` component, update the TabsTrigger for positions:

```tsx
<TabsTrigger value="positions" className="text-xs">
  Positions {positions.length}
</TabsTrigger>
```

The "Orders" and "Trades" tabs remain at 0 for now (limit orders and trade history are not yet implemented).

- [ ] **Step 2: Commit**

```bash
git add web/app/app/markets/\[ticker\]/page.tsx
git commit -m "feat: show live position count in market page tabs"
```

---

### Task 12: Smoke Test End-to-End

**Files:** None (testing only)

- [ ] **Step 1: Start the dev server**

Run: `cd web && npx next dev`

- [ ] **Step 2: Test the Prod/Mock toggle**

1. Navigate to `/app/markets/NVDAxt`
2. Verify the Prod/Mock toggle is visible in the top bar
3. Toggle to Mock -- the market should become open (mock deployment has no keeper restrictions)
4. Toggle back to Prod -- if NYSE is closed, the "Market Closed" banner should appear

- [ ] **Step 3: Test opening a position (mock mode)**

1. Connect wallet via Privy
2. Switch to Mock mode
3. Enter a USDC amount in the Pay field (ensure you have mock USDC)
4. Set leverage to 2x
5. Click "Long NVDA/USD"
6. Approve the USDC spend in wallet popup
7. Confirm the transaction
8. Verify: button shows "Confirming..." then "Done!"
9. Verify: position appears in the Positions table with entry price, PnL

- [ ] **Step 4: Test closing a position**

1. Click "Close" on the open position row
2. Approve the transaction
3. Verify: position disappears from the table

- [ ] **Step 5: Test market closed gating (prod mode)**

1. Switch to Prod mode
2. If market is closed, verify:
   - Red "Market is closed" banner appears
   - Long/Short buttons are disabled and show "Market Closed"
