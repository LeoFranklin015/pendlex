export const MARKET_KEEPER_ABI = [
  {
    name: "isMarketOpen",
    type: "function",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;
