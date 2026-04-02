import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  type PublicClient,
  type WalletClient,
  type Chain,
  type EIP1193Provider,
} from "viem";
import { DEFAULT_CHAIN } from "./config";

// Public client for read-only calls (no wallet needed)
export function getPublicClient(chain: Chain = DEFAULT_CHAIN): PublicClient {
  return createPublicClient({
    chain,
    transport: http(),
  });
}

// Wallet client from an EIP-1193 provider (Privy gives you this)
export function getWalletClient(
  provider: EIP1193Provider,
  chain: Chain = DEFAULT_CHAIN
): WalletClient {
  return createWalletClient({
    chain,
    transport: custom(provider),
  });
}
