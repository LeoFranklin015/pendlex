# Pendlex Frontend Integration Guide

This guide covers everything needed to wire the existing UI shells to the live smart contracts
deployed on Ink Sepolia and Ethereum Sepolia.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Contract Addresses](#2-contract-addresses)
3. [ABI Files](#3-abi-files)
4. [Viem Client Setup](#4-viem-client-setup)
5. [Token Decimals and Units](#5-token-decimals-and-units)
6. [ERC-20 Approvals](#6-erc-20-approvals)
7. [Pyth Oracle -- Fetching Update Data](#7-pyth-oracle----fetching-update-data)
8. [XStreamVault -- Vault Page](#8-xstreamvault----vault-page)
9. [XStreamExchange -- Market Page](#9-xstreamexchange----market-page)
10. [MarketKeeper -- Market Status](#10-marketkeeper----market-status)
11. [DxLeaseEscrow -- Auction Page](#11-dxleaseescrow----auction-page)
12. [Reading Balances and Positions](#12-reading-balances-and-positions)
13. [market-data.ts Updates](#13-market-datats-updates)
14. [Transaction UX Pattern](#14-transaction-ux-pattern)
15. [Network Switching](#15-network-switching)
16. [Quick Reference by Page](#16-quick-reference-by-page)

---

## 1. Environment Setup

Install viem if not already present:

```bash
npm install viem
```

The app already uses Privy for wallet connections (`web/app/providers.tsx`). Privy exposes an
EIP-1193 provider. Wrap it with viem's `createWalletClient`:

```ts
import { createWalletClient, createPublicClient, custom, http } from "viem";
import { inkSepolia, sepolia } from "viem/chains";
import { useWallets } from "@privy-io/react-auth";

function useClients() {
  const { wallets } = useWallets();
  const wallet = wallets[0];

  if (!wallet) return { publicClient: null, walletClient: null };

  const chain = wallet.chainId === "eip155:763373" ? inkSepolia : sepolia;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain,
    transport: custom(wallet.getEthereumProvider()),
  });

  return { publicClient, walletClient };
}
```

---

## 2. Contract Addresses

### Prod Deployment (Real Dinari xStocks + Real Pyth Oracle)

**Ink Sepolia (Chain ID: 763373)**

```ts
export const PROD_INK_SEPOLIA = {
  pythContract: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  pythAdapter:  "0xb26b353B4247f9db66175b333CDa74a7c068D341",
  usdc:         "0xC80EF19a1F4F49953B0383b411a74fd50f2ca361",
  vault:        "0x9e35DE19e3D7DB531C42fFc91Cc3a6F5Ba30B610",
  exchange:     "0x924eb79Bb78981Afa209E45aB3E50ee9d77D1D0F",
  marketKeeper: "0xcF0a135097b1CA2B21ADDeae20a883D9BACE1f74",
  escrow:       "0xC18288E58B79fAac72811dC1456515A88147e85a",
  assets: [
    {
      symbol: "TSLA",   ticker: "TSLAxt",
      xStock:   "0x9F64b176fEDF64a9A37ba58d372f3bd13B5F73b4",
      pxToken:  "0x94461B0C10B371c9dE4DfFD1A08249e07c136d37",
      dxToken:  "0x1FC97eAd7E36926bE30229762458C2B2aBB77d6F",
      lpToken:  "0x6DfeBd1e56c26e055F3AD1FC3397EC7e68f8dD5C",
      pythFeedId: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
    },
    {
      symbol: "NVDA",   ticker: "NVDAxt",
      xStock:   "0xfeE1b917518EFa5c63C6baB841426F6A52b8581e",
      pxToken:  "0xC1EFf33ba4fA5Ae036202Fe098030e59e078dd6D",
      dxToken:  "0x12189923F13e0c2eD2c450189E7419E772281866",
      lpToken:  "0x5b9D0DEE7CC10B4043E44F4EC1CE768c5c7cf745",
      pythFeedId: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
    },
    {
      symbol: "GOOGL",  ticker: "GOOGLxt",
      xStock:   "0x9eE3eb32dD9Da95Cd1D9C824701A1EcF9AE046B2",
      pxToken:  "0x047BF5F5a416d1A0E8f98a99538CEb0c7bC9aD3B",
      dxToken:  "0x7345c2917E2e6960C0dAc0A3079cc94b4246aC92",
      lpToken:  "0xbc3f35De8571Ce748c82255CBA411b429572CfF8",
      pythFeedId: "0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6",
    },
    {
      symbol: "AAPL",   ticker: "AAPLxt",
      xStock:   "0x3e3885a7106107728afEF74A0000d90D3fA3cd1e",
      pxToken:  "0x65abD57f02D23F774631778550b33f59cA4D300D",
      dxToken:  "0xE7fF40cAB800a5E6DB733BF30D733777eE3285b5",
      lpToken:  "0xEF7B7faF6d25E58925A523097d3888Bccba91F6e",
      pythFeedId: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
    },
    {
      symbol: "SPY",    ticker: "SPYxt",
      xStock:   "0xC16212b6840001f0a4382c3Da3c3f136C5b1cC31",
      pxToken:  "0xC6555380D2E6AAA3Ca7d803a237d4c21e0e9D1a3",
      dxToken:  "0x928dA312a5cDAc140C7cD18F8eCBCaeb73796B9f",
      lpToken:  "0x01aA0e0Fa5623A16DF232ade97095B5919f9E183",
      pythFeedId: "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5",
    },
    {
      symbol: "TBLL",   ticker: "TBLLxt",
      xStock:   "0x06fdEB09bdCC13eCCC758b15DC81a45c839632d7",
      pxToken:  "0x5e421FEAD3A1ad4A48843d1Eaea64Aa7d73a7F96",
      dxToken:  "0x36ED5c732bA99a715e491F6601011D804ED6Fd6C",
      lpToken:  "0x3119eDacE1c3b43e81F65F635c1E48Ef5F89409b",
      pythFeedId: "0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2",
    },
    {
      symbol: "GLD",    ticker: "GLDxt",
      xStock:   "0xedB61935572130a7946B7FA9A3EC788367047E4D",
      pxToken:  "0xAd284878a45E75E8D8e5128573a708cFc99F9730",
      dxToken:  "0x00e2675da5031dd4d107A092C34e8E01196c7cf9",
      lpToken:  "0xf5B69cDF448BE6e7334823b085eBD50587Bd0E77",
      pythFeedId: "0x18bc5360b4a8d29fd8de4c7f9e40234440de7572c5ff74f0697f14d2afd5a820",
    },
    {
      symbol: "SLV",    ticker: "SLVxt",
      xStock:   "0x24A25fB43521D93AB57D1d57B0531fA5813a238c",
      pxToken:  "0xD323e038Be2f630e9119c19AD152843b898902a0",
      dxToken:  "0xeF7Dbea9B659EecD793AbD1b13c66431d6A695af",
      lpToken:  "0xf2420295b1C1C9f9ee5a9277770e7df30abC3504",
      pythFeedId: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
    },
  ],
} as const;
```

**Ethereum Sepolia (Chain ID: 11155111)**

```ts
export const PROD_ETH_SEPOLIA = {
  pythContract: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  pythAdapter:  "0x04e32F127a2baEA28512Fa04F1dCD82e1Fdf3971",
  usdc:         "0xF2CE01ca6E39873a4d51cC40353Df309Ec424103",
  vault:        "0xb9DA59D8A25B15DFB6f7A02EB277ADCC34d8B5a8",
  exchange:     "0xEaB336258044846C5b9523967081BDC078C064d6",
  marketKeeper: "0xF382a19D4F3A8aD4288eE55CA363f47E91ceD563",
  escrow:       "0xC1481eE1f92053A778B6712d6F46e3BeaB339FD7",
  assets: [
    {
      symbol: "TSLA",  ticker: "TSLAxt",
      xStock:   "0x27c253BB83731D6323b3fb2B333DcF0C94b6031e",
      pxToken:  "0x048F9f6B51E3cd6a0D421FDA035931d2bA695149",
      dxToken:  "0x356469a8dF616AA8d16CA606A0b5426D740701Ae",
      lpToken:  "0x591661b08147e34E911Ea2eBC005F009E6eE93B8",
      pythFeedId: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
    },
    {
      symbol: "NVDA",  ticker: "NVDAxt",
      xStock:   "0xaDfdf3EC7dC440931D363DA1D97b8Ee0479Dc409",
      pxToken:  "0x0e318c4eBD5A01c5b2f2484151f6209cfdfd538a",
      dxToken:  "0x9C41f79fB6D8856f4446c94BF307353064991163",
      lpToken:  "0xB553Cdb7642d3C7ADbb202AFa3c626a5Fd7FF1A1",
      pythFeedId: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
    },
    {
      symbol: "GOOGL", ticker: "GOOGLxt",
      xStock:   "0x8A36935c0F5137ceA736F28886ef8F480a1a1727",
      pxToken:  "0xD94574363c0Bb7c99F27F32d104e98b974676cE9",
      dxToken:  "0x0b64fed2D8b88603eF69B90EBaa549F54CE80831",
      lpToken:  "0x72871F9b5Fc00225B25F8841a57b03419fF3bA72",
      pythFeedId: "0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6",
    },
    {
      symbol: "AAPL",  ticker: "AAPLxt",
      xStock:   "0x6DEfC6061Cafa52d96FAf60AE7A7D727a75C3Bdb",
      pxToken:  "0x39f90Ec480F9FA4F18216b9847204bFA9AC38e7A",
      dxToken:  "0xb8c41D20f2e73d4A425f0b97C219eBb0b6add321",
      lpToken:  "0x2F0C60F95a10611E40F6717A6FDb9Eb5Cf1C7be5",
      pythFeedId: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
    },
    {
      symbol: "SPY",   ticker: "SPYxt",
      xStock:   "0x7312c657e8c73c09dD282c5E7cBdDf43ace25cFc",
      pxToken:  "0xc8365cABDAa9A413bE023395813C48461fE97573",
      dxToken:  "0x72fDEdCB8b086e07ac253437Fa3111101dcFA4f8",
      lpToken:  "0x4e3159b26ba5Ca9521658c4D203f38472FC88Da9",
      pythFeedId: "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5",
    },
    {
      symbol: "TBLL",  ticker: "TBLLxt",
      xStock:   "0x6b4aDe3cAa2bEa98CEbe7019E09d69c23CD11C42",
      pxToken:  "0x4b248fa6B6F62eA77A2666Ad8CfC9C16215B1e5A",
      dxToken:  "0x3eC401F51Ca05BD2Aea4E2A28B96bfB463c7214B",
      lpToken:  "0xFB80c2DD9c2880be70b3d43C5F0EFEa8E2ef1c21",
      pythFeedId: "0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2",
    },
    {
      symbol: "GLD",   ticker: "GLDxt",
      xStock:   "0xeae1f4476fDBD4FaED890568b1Cf69F372d72462",
      pxToken:  "0xc8e614bF58F3b5b27A007Af826Bb00FF27a4c645",
      dxToken:  "0xB8e66090d72e0Bb32e1A5aa8B7B104816b1889a8",
      lpToken:  "0x93d02177AAb72Be67B4bc21821856F7E3ddb53F6",
      pythFeedId: "0x18bc5360b4a8d29fd8de4c7f9e40234440de7572c5ff74f0697f14d2afd5a820",
    },
    {
      symbol: "SLV",   ticker: "SLVxt",
      xStock:   "0x732C084288F3E7eF4D0b6Cdb6bdcbFd072DfEb92",
      pxToken:  "0xf567a061Cd60F70510425E8Deb4eB8c8D67A7fb2",
      dxToken:  "0x7e65fe690639a06c77ea2a89a99d1EdF58c8D0ba",
      lpToken:  "0xf22071f7b7a3099702f5743FE88307BCCdc6f2C2",
      pythFeedId: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
    },
  ],
} as const;
```

### Mock Deployment (Mock Pyth + Mock xStocks -- for local testing)

**Ink Sepolia**

```ts
export const MOCK_INK_SEPOLIA = {
  mockPyth:     "0x6C0602E1ef5F6a841ae61DF5A996d04BE7D21F6D",
  pythAdapter:  "0x73AA2f12E39110E5A2328F23Fc97ba0F024c13D6",
  usdc:         "0x0fE3321c5ACAE1ac8739978216F93AaE674EC1fE",
  vault:        "0xF0391bEACCA59d2a1A4A339af88dCDeAe210e6B6",
  exchange:     "0x859305A541536B1A2A3BFcaE05244DEAfdB1E167",
  marketKeeper: "0xC4E002Ab619C3C31b3Bc631b299e28e3D6C93CCa",
  escrow:       "0x662dc3B17696A688efd297D9DF5eFa4B21B607fB",
} as const;
```

**Ethereum Sepolia**

```ts
export const MOCK_ETH_SEPOLIA = {
  mockPyth:     "0x16Ddd24738b05FC80989cbd2577F606962b65C31",
  pythAdapter:  "0x16eaB2D3E31Cc44D040Cf316141CD460F51DF50c",
  usdc:         "0x6913883E8c11829AC213760556F3C3b35148F296",
  vault:        "0xE7e63166543CEAE1d389e38f8b3faee8129cAfC2",
  exchange:     "0xDbfA9BBdfAb52DCB453105D70c5991d3D1C0E34D",
  marketKeeper: "0x9e5b98455102F21f47d6e0A6FC6a33f4c382aE51",
  escrow:       "0xb2131C8384599d95d2Cdd7733529Bfd7B3c68375",
} as const;
```

### Helper: Get Config for Active Chain

```ts
export function getContractConfig(chainId: number) {
  switch (chainId) {
    case 763373:   return PROD_INK_SEPOLIA;
    case 11155111: return PROD_ETH_SEPOLIA;
    default:       throw new Error(`Unsupported chain: ${chainId}`);
  }
}

export function getAssetByTicker(chainId: number, ticker: string) {
  const cfg = getContractConfig(chainId);
  return cfg.assets.find((a) => a.ticker === ticker) ?? null;
}
```

---

## 3. ABI Files

Copy the ABI arrays out of the Foundry output files. Each compiled JSON lives at
`contracts/out/<ContractName>.sol/<ContractName>.json` -- extract the `abi` field.

Recommended file layout under `web/lib/abis/`:

```
web/lib/abis/
  XStreamVault.json
  XStreamExchange.json
  MarketKeeper.json
  DxLeaseEscrow.json
  ERC20.json          <- standard ERC-20 ABI (approve, balanceOf, allowance)
```

Minimal ERC-20 ABI you need:

```ts
export const ERC20_ABI = [
  { name: "approve",   type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { name: "allowance", type: "function", inputs: [{ name: "owner",   type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "balanceOf", type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "decimals",  type: "function", inputs: [], outputs: [{ type: "uint8" }],  stateMutability: "view" },
] as const;
```

---

## 4. Viem Client Setup

Suggested hook at `web/lib/use-contracts.ts`:

```ts
import { useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http, getContract } from "viem";
import { inkSepolia, sepolia } from "viem/chains";
import { getContractConfig } from "./addresses";
import VaultABI       from "./abis/XStreamVault.json";
import ExchangeABI    from "./abis/XStreamExchange.json";
import KeeperABI      from "./abis/MarketKeeper.json";
import EscrowABI      from "./abis/DxLeaseEscrow.json";
import { ERC20_ABI }  from "./abis/erc20";

export function useContracts() {
  const { wallets } = useWallets();
  const wallet = wallets[0];

  if (!wallet) return null;

  const chainId = parseInt(wallet.chainId.split(":")[1]);
  const chain   = chainId === 763373 ? inkSepolia : sepolia;
  const cfg     = getContractConfig(chainId);

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({
    chain,
    transport: custom(wallet.getEthereumProvider()),
  });

  const vault    = getContract({ address: cfg.vault,    abi: VaultABI,    client: { public: publicClient, wallet: walletClient } });
  const exchange = getContract({ address: cfg.exchange, abi: ExchangeABI, client: { public: publicClient, wallet: walletClient } });
  const keeper   = getContract({ address: cfg.marketKeeper, abi: KeeperABI, client: { public: publicClient, wallet: walletClient } });
  const escrow   = getContract({ address: cfg.escrow,   abi: EscrowABI,   client: { public: publicClient, wallet: walletClient } });

  function erc20(address: `0x${string}`) {
    return getContract({ address, abi: ERC20_ABI, client: { public: publicClient, wallet: walletClient } });
  }

  return { publicClient, walletClient, vault, exchange, keeper, escrow, erc20, cfg, chainId };
}
```

---

## 5. Token Decimals and Units

| Token              | Decimals | Note                                  |
|--------------------|----------|---------------------------------------|
| USDC               | 6        | collateral for trading and auctions   |
| xStock (Dinari)    | 18       | the underlying tokenized equity       |
| pxToken            | 18       | price exposure token (from vault)     |
| dxToken            | 18       | income/dividend token (from vault)    |
| lpToken            | 18       | exchange liquidity token              |

Convert user-facing strings to on-chain units:

```ts
import { parseUnits, formatUnits } from "viem";

const usdcAmount  = parseUnits("1000", 6);   // 1000 USDC -> 1000_000000n
const tokenAmount = parseUnits("10",   18);  // 10 tokens -> 10_000000000000000000n

const display = formatUnits(rawBigInt, 6);   // USDC
const display = formatUnits(rawBigInt, 18);  // tokens
```

All contract functions that receive USDC use 6-decimal amounts. All xStock / px / dx / lp
amounts use 18-decimal amounts.

---

## 6. ERC-20 Approvals

Every write that transfers tokens from the user requires an `approve` first. Call `allowance`
first to avoid an extra tx if already approved.

```ts
async function ensureApproval(
  erc20: ReturnType<typeof useContracts>["erc20"],
  tokenAddress: `0x${string}`,
  spender:      `0x${string}`,
  amount:       bigint,
  account:      `0x${string}`,
) {
  const token   = erc20(tokenAddress);
  const current = await token.read.allowance([account, spender]);
  if (current < amount) {
    const hash = await token.write.approve([spender, amount], { account });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}
```

**Approval matrix:**

| Action                  | Token to Approve | Spender          |
|-------------------------|------------------|------------------|
| Vault deposit           | xStock           | vault address    |
| Vault withdraw          | pxToken + dxToken (each) | vault address |
| Open long / short       | USDC             | exchange address |
| Exchange LP deposit     | USDC             | exchange address |
| Exchange LP withdraw    | lpToken          | exchange address |
| Auction open listing    | dxToken          | escrow address   |
| Auction place bid       | USDC             | escrow address   |

---

## 7. Pyth Oracle -- Fetching Update Data

`openLong`, `openShort`, `closeLong`, `closeShort`, `settleAllPositions`, and
`closeMarket` all require a `bytes[] pythUpdateData` argument containing a signed
VAA from Pyth Hermes. This is a live price attestation -- it must be fetched fresh
right before submitting the transaction.

**Hermes endpoint:** `https://hermes.pyth.network`

The update data also costs a small ETH fee (`getUpdateFee`) that must be sent as
`msg.value`.

```ts
const HERMES = "https://hermes.pyth.network";

async function fetchPythUpdateData(feedIds: string[]): Promise<{
  updateData: `0x${string}`[];
  fee:        bigint;
}> {
  const params = feedIds.map((id) => `ids[]=${id}`).join("&");
  const res    = await fetch(`${HERMES}/v2/updates/price/latest?${params}&encoding=hex&parsed=true`);
  const json   = await res.json();

  // binary field is the VAA, hex-encoded
  const updateData: `0x${string}`[] = json.binary.data.map(
    (d: string) => `0x${d}` as `0x${string}`
  );

  // Ask the Pyth contract how much fee to attach
  const fee = await publicClient.readContract({
    address: PYTH_CONTRACT, // 0x2880aB155794e7179c9eE2e38200202908C17B43
    abi: [{ name: "getUpdateFee", type: "function", inputs: [{ name: "updateData", type: "bytes[]" }], outputs: [{ type: "uint256" }], stateMutability: "view" }],
    functionName: "getUpdateFee",
    args: [updateData],
  });

  return { updateData, fee };
}
```

Usage pattern before any trade:

```ts
const asset      = getAssetByTicker(chainId, "NVDAxt");
const { updateData, fee } = await fetchPythUpdateData([asset.pythFeedId]);

// Pass updateData into the contract call, attach fee as value
const positionId = await exchange.write.openLong(
  [asset.pxToken, collateralUsdc, leverageBigInt, updateData],
  { account, value: fee }
);
```

---

## 8. XStreamVault -- Vault Page

The vault page (`/app/vault`) is a deposit/withdraw UI for splitting xStock into
pxToken (price exposure) + dxToken (income stream).

### 8.1 Deposit xStock

User selects an asset and enters an amount. You need:
1. Approve the xStock token for the vault
2. Call `vault.deposit(xStock, amount)`

```ts
async function vaultDeposit(
  ticker:  string,
  amount:  string,   // human-readable, e.g. "10"
  account: `0x${string}`,
) {
  const asset      = getAssetByTicker(chainId, ticker)!;
  const rawAmount  = parseUnits(amount, 18);

  await ensureApproval(erc20, asset.xStock, cfg.vault, rawAmount, account);

  const hash = await vault.write.deposit([asset.xStock, rawAmount], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

After this call the user receives equal amounts of pxToken and dxToken (1:1 ratio).

### 8.2 Withdraw xStock

User burns equal amounts of pxToken and dxToken to reclaim xStock:
1. Approve pxToken for vault
2. Approve dxToken for vault
3. Call `vault.withdraw(xStock, amount)`

```ts
async function vaultWithdraw(
  ticker:  string,
  amount:  string,
  account: `0x${string}`,
) {
  const asset     = getAssetByTicker(chainId, ticker)!;
  const rawAmount = parseUnits(amount, 18);

  await ensureApproval(erc20, asset.pxToken, cfg.vault, rawAmount, account);
  await ensureApproval(erc20, asset.dxToken, cfg.vault, rawAmount, account);

  const hash = await vault.write.withdraw([asset.xStock, rawAmount], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

### 8.3 Read Pending Dividend

Plug this into the "Claimable Rewards" stat card (currently showing `$8.22` mock data):

```ts
async function getPendingDividend(ticker: string, account: `0x${string}`) {
  const asset = getAssetByTicker(chainId, ticker)!;
  const raw   = await vault.read.pendingDividend([asset.xStock, account]);
  return formatUnits(raw, 18); // xStock token units
}
```

### 8.4 Claim Dividend

Wired to the "Collect Earnings" button:

```ts
async function claimDividend(ticker: string, account: `0x${string}`) {
  const asset = getAssetByTicker(chainId, ticker)!;
  const hash  = await vault.write.claimDividend([asset.xStock], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

### 8.5 Read User Balances for the Vault Page

```ts
async function getVaultBalances(ticker: string, account: `0x${string}`) {
  const asset = getAssetByTicker(chainId, ticker)!;
  const [xStockBal, pxBal, dxBal] = await Promise.all([
    erc20(asset.xStock).read.balanceOf([account]),
    erc20(asset.pxToken).read.balanceOf([account]),
    erc20(asset.dxToken).read.balanceOf([account]),
  ]);
  return {
    xStock: formatUnits(xStockBal, 18),
    px:     formatUnits(pxBal,     18),
    dx:     formatUnits(dxBal,     18),
  };
}
```

Replace the hardcoded `Balance: 1,250.00 xSPY` strings in `vault/page.tsx` with
these live values.

---

## 9. XStreamExchange -- Market Page

The market page (`/app/markets/[ticker]`) contains the order form. Only
`XStreamExchange` is involved in trading. The `pxToken` for the selected asset
is the pool identifier.

### 9.1 Check Market Status (Gate the Order Form)

```ts
async function isMarketOpen(): Promise<boolean> {
  return exchange.read.marketOpen();
}
```

Disable the "Long" / "Short" buttons and show a banner when `marketOpen() === false`.

### 9.2 Open Long Position

```ts
async function openLong(
  ticker:    string,
  collateral: string,  // USDC, human-readable e.g. "1000"
  leverage:   number,  // e.g. 3
  account:    `0x${string}`,
) {
  const asset        = getAssetByTicker(chainId, ticker)!;
  const rawCollateral = parseUnits(collateral, 6); // USDC 6 dec
  const rawLeverage   = BigInt(Math.floor(leverage * 1e18)); // 18 dec fixed point

  const { updateData, fee } = await fetchPythUpdateData([asset.pythFeedId]);
  await ensureApproval(erc20, cfg.usdc, cfg.exchange, rawCollateral, account);

  const hash = await exchange.write.openLong(
    [asset.pxToken, rawCollateral, rawLeverage, updateData],
    { account, value: fee }
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Decode positionId from PositionOpened event
  const event = receipt.logs.find(/* parse PositionOpened event */);
  return receipt;
}
```

The `PositionOpened` event emits `positionId` (bytes32). Store it -- you need it
to close the position.

### 9.3 Open Short Position

Same as long but calls `openShort`:

```ts
const hash = await exchange.write.openShort(
  [asset.pxToken, rawCollateral, rawLeverage, updateData],
  { account, value: fee }
);
```

### 9.4 Close Long / Short

```ts
async function closePosition(
  positionId: `0x${string}`,
  isLong:      boolean,
  ticker:      string,
  account:     `0x${string}`,
) {
  const asset = getAssetByTicker(chainId, ticker)!;
  const { updateData, fee } = await fetchPythUpdateData([asset.pythFeedId]);

  const hash = isLong
    ? await exchange.write.closeLong([positionId, updateData],  { account, value: fee })
    : await exchange.write.closeShort([positionId, updateData], { account, value: fee });

  return publicClient.waitForTransactionReceipt({ hash });
}
```

The return value from `closeLong` / `closeShort` is `int256 pnl` in USDC (6 dec).

### 9.5 Read Unrealized PnL

Use this to populate the Positions table in the market page (currently empty):

```ts
async function getUnrealizedPnl(positionId: `0x${string}`, ticker: string) {
  const asset = getAssetByTicker(chainId, ticker)!;
  const { updateData } = await fetchPythUpdateData([asset.pythFeedId]);

  const [pnl, collateralRemaining, isLiquidatable] =
    await exchange.read.getUnrealizedPnl([positionId, updateData]);

  return {
    pnl:              formatUnits(pnl,               6),
    collateralLeft:   formatUnits(collateralRemaining, 6),
    isLiquidatable,
  };
}
```

### 9.6 Read Position Details

```ts
async function getPosition(positionId: `0x${string}`) {
  // Returns: (address trader, address pxToken, bool isLong,
  //           uint256 collateral, uint256 notional, uint256 entryPrice,
  //           uint256 openedAt, uint256 borrowAccumulator)
  return exchange.read.getPosition([positionId]);
}
```

`entryPrice` is in 8-decimal Pyth format. Divide by `1e8` to display in USD.

### 9.7 LP Deposit / Withdraw

Wire to an "Add Liquidity" flow for power users:

```ts
// Deposit USDC into a pool's LP reserves
async function lpDeposit(ticker: string, usdcAmount: string, account: `0x${string}`) {
  const asset  = getAssetByTicker(chainId, ticker)!;
  const raw    = parseUnits(usdcAmount, 6);
  await ensureApproval(erc20, cfg.usdc, cfg.exchange, raw, account);
  const hash   = await exchange.write.depositLiquidity([asset.pxToken, raw], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}

// Burn lpShares to reclaim USDC
async function lpWithdraw(ticker: string, lpShares: string, account: `0x${string}`) {
  const asset = getAssetByTicker(chainId, ticker)!;
  const raw   = parseUnits(lpShares, 18);
  await ensureApproval(erc20, asset.lpToken, cfg.exchange, raw, account);
  const hash  = await exchange.write.withdrawLiquidity([asset.pxToken, raw], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

---

## 10. MarketKeeper -- Market Status

The `MarketKeeper` controls whether the exchange allows new positions. Query it to
show the market open / closed badge visible in the market header.

```ts
async function fetchMarketStatus(): Promise<"OPEN" | "CLOSED"> {
  const open = await keeper.read.isMarketOpen();
  return open ? "OPEN" : "CLOSED";
}
```

Poll this every 30 seconds or on each page focus. The existing `MarketState` enum
in `lib/constants.ts` maps directly -- `"OPEN"` and `"CLOSED"` are already defined.

---

## 11. DxLeaseEscrow -- Auction Page

The auction page (`/app/auction`) allows holders of dxTokens to auction off their
income stream. Bidders pay USDC to lease the stream for N quarters.

### 11.1 List New Auction (Open Listing Panel)

Replace the inert "List for Auction" button:

```ts
async function openAuction(
  dxTokenAddress:  `0x${string}`,
  amount:          string,   // dxToken amount, 18 dec
  basePrice:       string,   // USDC floor, 6 dec
  auctionDays:     number,   // how long bidding runs (seconds)
  leaseDays:       number,   // how long the winner holds the stream (seconds)
  account:         `0x${string}`,
) {
  const rawAmount    = parseUnits(amount,    18);
  const rawBasePrice = parseUnits(basePrice, 6);
  const auctionSecs  = BigInt(auctionDays * 86400);
  const leaseSecs    = BigInt(leaseDays   * 86400);

  await ensureApproval(erc20, dxTokenAddress, cfg.escrow, rawAmount, account);

  const hash = await escrow.write.openAuction(
    [dxTokenAddress, rawAmount, rawBasePrice, auctionSecs, leaseSecs],
    { account }
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // Decode listingId from AuctionOpened event
  return receipt;
}
```

The `auctionDuration` and `leaseDuration` map to the "Number of Quarters" UI picker:
- 1Q = 90 days lease, 7-day auction window
- 2Q = 180 days, etc.

### 11.2 Place Bid

Replace the inert "Bid" button in `AuctionDetailPanel`:

```ts
async function placeBid(
  listingId: bigint,
  bidAmount: string,   // USDC, human-readable
  account:   `0x${string}`,
) {
  const raw = parseUnits(bidAmount, 6);
  await ensureApproval(erc20, cfg.usdc, cfg.escrow, raw, account);

  const hash = await escrow.write.placeBid([listingId, raw], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

### 11.3 Read Active Listings

The auction page currently uses `mockAuctions` from `auction-data.ts`. Replace with
on-chain data:

```ts
async function getActiveListing(dxTokenAddress: `0x${string}`) {
  const listingId = await escrow.read.activeListingByDxToken([dxTokenAddress]);
  if (listingId === 0n) return null; // no active listing

  const listing = await escrow.read.getListing([listingId]);
  // Struct: (address seller, address dxToken, uint256 amount, uint256 basePrice,
  //          uint256 highestBid, address highestBidder, uint256 endsAt,
  //          uint256 leaseEndsAt, bool finalized, bool cancelled)
  return { listingId, ...listing };
}
```

Iterate over all deployed `dxToken` addresses from the config to build the full
auction list. Cache results -- these are read-only calls that do not change frequently.

### 11.4 Finalize Auction (After Expiry)

When `endsAt` has passed the auction can be finalized by anyone:

```ts
async function finalizeAuction(listingId: bigint, account: `0x${string}`) {
  const hash = await escrow.write.finalizeAuction([listingId], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

### 11.5 Claim Dividends as Winner

The auction winner calls this to pull accumulated dividends out of the vault:

```ts
async function claimLeaseRewards(listingId: bigint, account: `0x${string}`) {
  const hash = await escrow.write.claimAndDistribute([listingId], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

### 11.6 Withdraw Outbid Refund

When a user is outbid their USDC stays in the escrow as a refundable balance:

```ts
async function withdrawRefund(account: `0x${string}`) {
  const refundable = await escrow.read.refundableBalance([account]);
  if (refundable === 0n) return null;
  const hash = await escrow.write.withdrawRefund([], { account });
  return publicClient.waitForTransactionReceipt({ hash });
}
```

Show a "Claim Refund" banner on the auction page whenever `refundableBalance > 0`.

---

## 12. Reading Balances and Positions

### Portfolio / Holdings

For a user's full portfolio:

```ts
async function getUserPortfolio(account: `0x${string}`) {
  const assets = cfg.assets;

  const results = await Promise.all(assets.map(async (a) => {
    const [xStockBal, pxBal, dxBal, usdcBal, pending] = await Promise.all([
      erc20(a.xStock).read.balanceOf([account]),
      erc20(a.pxToken).read.balanceOf([account]),
      erc20(a.dxToken).read.balanceOf([account]),
      erc20(cfg.usdc).read.balanceOf([account]),
      vault.read.pendingDividend([a.xStock, account]),
    ]);
    return {
      symbol:         a.symbol,
      xStockBalance:  formatUnits(xStockBal, 18),
      pxBalance:      formatUnits(pxBal,     18),
      dxBalance:      formatUnits(dxBal,     18),
      pendingDividend: formatUnits(pending,  18),
    };
  }));

  const usdc = await erc20(cfg.usdc).read.balanceOf([account]);

  return { assets: results, usdcBalance: formatUnits(usdc, 6) };
}
```

---

## 13. market-data.ts Updates

`web/lib/market-data.ts` currently only has 4 assets (NVDA, GOOGL, AAPL, SPY).
Expand to all 8 and add contract-aware fields:

```ts
export const xStockAssets: Asset[] = [
  { ticker: "TSLAxt", name: "Tesla xStock",        symbol: "TSLA", type: "Stock", color: "#cc0000", logo: "...", pythFeedId: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
  { ticker: "NVDAxt", name: "NVIDIA xStock",       symbol: "NVDA", type: "Stock", color: "#76b900", logo: "...", pythFeedId: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
  { ticker: "GOOGLxt",name: "Alphabet xStock",     symbol: "GOOGL",type: "Stock", color: "#4285f4", logo: "...", pythFeedId: "0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
  { ticker: "AAPLxt", name: "Apple xStock",        symbol: "AAPL", type: "Stock", color: "#555555", logo: "...", pythFeedId: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
  { ticker: "SPYxt",  name: "SP500 xStock",        symbol: "SPY",  type: "ETF",   color: "#e4002b", logo: "...", pythFeedId: "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
  { ticker: "TBLLxt", name: "T-Bill xStock",       symbol: "TBLL", type: "ETF",   color: "#2563eb", logo: "...", pythFeedId: "0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
  { ticker: "GLDxt",  name: "Gold xStock",         symbol: "GLD",  type: "ETF",   color: "#f59e0b", logo: "...", pythFeedId: "0x18bc5360b4a8d29fd8de4c7f9e40234440de7572c5ff74f0697f14d2afd5a820", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
  { ticker: "SLVxt",  name: "Silver xStock",       symbol: "SLV",  type: "ETF",   color: "#94a3b8", logo: "...", pythFeedId: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e", price: 0, prevPrice: 0, change: 0, changePercent: 0, confidence: 0, apy: 0 },
];
```

The `pythFeedId` values here are the real Pyth feed IDs already consumed by
`use-pyth-prices.ts` and `use-pyth-candles.ts`. They are also the exact values
the deployed contracts use -- no separate mapping is needed.

---

## 14. Transaction UX Pattern

All write calls follow the same pattern. Suggested hook structure:

```ts
type TxState = "idle" | "approving" | "pending" | "success" | "error";

function useTxFlow() {
  const [state,  setState]  = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  async function execute(fn: () => Promise<{ transactionHash: string }>) {
    setState("pending");
    setError(null);
    try {
      const receipt = await fn();
      setTxHash(receipt.transactionHash);
      setState("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
      setState("error");
    }
  }

  return { state, txHash, error, execute };
}
```

Use `state` to drive button labels:
- `idle`     -> "Long NVDA" / "Deposit" / "Bid"
- `approving` -> "Approving..."
- `pending`  -> "Confirming..."
- `success`  -> "Done!" (auto-reset after 3s)
- `error`    -> show `error` message

---

## 15. Network Switching

`providers.tsx` already sets `defaultChain: inkSepolia`. When a user on Ethereum
Sepolia interacts, Privy will prompt them to switch networks.

To manually trigger a network switch:

```ts
import { useSwitchChain } from "@privy-io/react-auth";

const { switchChain } = useSwitchChain();

// Ink Sepolia
await switchChain({ chainId: 763373 });

// Ethereum Sepolia
await switchChain({ chainId: 11155111 });
```

The `getContractConfig(chainId)` helper in Section 2 handles the correct addresses
automatically once the chain is switched.

---

## 16. Quick Reference by Page

### `/app/vault`

| UI Element               | Contract Call                                                |
|--------------------------|--------------------------------------------------------------|
| "Vault Balance" stat     | `balanceOf(pxToken)` + `balanceOf(dxToken)` for user        |
| "Claimable Rewards" stat | `vault.read.pendingDividend(xStock, account)`               |
| Asset balance label      | `balanceOf(xStock, account)`                                |
| Deposit button           | `ensureApproval(xStock, vault)` then `vault.deposit()`      |
| Withdraw button          | `ensureApproval(px + dx, vault)` then `vault.withdraw()`    |
| Collect Earnings button  | `vault.claimDividend(xStock)`                               |

### `/app/markets/[ticker]`

| UI Element               | Contract Call                                                |
|--------------------------|--------------------------------------------------------------|
| Market open/closed badge | `exchange.read.marketOpen()`                                |
| Long button              | `fetchPythUpdateData` -> `exchange.openLong()`              |
| Short button             | `fetchPythUpdateData` -> `exchange.openShort()`             |
| Positions table rows     | `exchange.getPosition(positionId)` + `getUnrealizedPnl()`   |
| Close button (position)  | `exchange.closeLong()` or `closeShort()` with updateData    |
| Entry price display      | from `getPosition().entryPrice / 1e8`                       |
| Liq. price display       | `collateral / (notional / entryPrice) * threshold`         |

### `/app/auction`

| UI Element               | Contract Call                                                |
|--------------------------|--------------------------------------------------------------|
| Auction grid             | `escrow.read.activeListingByDxToken(dxToken)` per asset     |
| Bid form submit          | `ensureApproval(USDC, escrow)` then `escrow.placeBid()`     |
| List Token button        | `ensureApproval(dxToken, escrow)` then `escrow.openAuction()` |
| Finalize expired auction | `escrow.finalizeAuction(listingId)`                         |
| Claim refund banner      | `escrow.read.refundableBalance(account)` -> `withdrawRefund()` |

### `/app/portfolio` (when built)

| UI Element               | Contract Call                                                |
|--------------------------|--------------------------------------------------------------|
| Holdings table           | `balanceOf` for xStock, px, dx per asset                    |
| Unclaimed dividends      | `vault.read.pendingDividend(xStock, account)` per asset     |
| Open positions           | iterate stored `positionId` list + `exchange.getPosition()` |
| USDC balance             | `balanceOf(usdc, account)`                                  |

---

## Key Notes

- **Collateral** in `openLong`/`openShort` is in USDC (6 decimals). The `leverage`
  parameter is an 18-decimal fixed-point uint256 (e.g. `3x = 3n * 10n**18n`).

- **Pyth fee** -- always attach the `fee` returned by `getUpdateFee` as `msg.value`
  when calling any function that takes `pythUpdateData`. If omitted the tx reverts.

- **Position IDs** are `bytes32` returned from `openLong`/`openShort` events. Store
  them in localStorage or a user-scoped database indexed by `account + chainId`.

- **dxToken dividends** accrue as the underlying xStock's multiplier changes.
  Call `vault.syncDividend(xStock)` before reading `pendingDividend` if you want
  the freshest value (or just read it directly -- it auto-syncs on deposit/withdraw).

- **Market hours** -- `isMarketOpen()` on `MarketKeeper` reflects the keeper bot's
  judgment of NYSE session hours. The UI should poll this every 60s and gate all
  open-position flows behind it.
