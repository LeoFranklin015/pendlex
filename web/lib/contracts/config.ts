import { inkSepolia } from "viem/chains";
export const DEFAULT_CHAIN = inkSepolia;

const SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/oJTjnNCsJEOqYv3MMtrtT6LUFhwcW9pR";

export function getRpcUrl(chainId: number): string | undefined {
  if (chainId === 11155111) return SEPOLIA_RPC;
  return undefined; // use viem default
}
