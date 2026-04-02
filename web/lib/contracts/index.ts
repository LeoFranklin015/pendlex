export { getPublicClient, getWalletClient } from "./client";
export { useContractRead, useContractWrite } from "./useContract";
export { DEFAULT_CHAIN } from "./config";
export {
  PROD_INK_SEPOLIA,
  PROD_ETH_SEPOLIA,
  MOCK_INK_SEPOLIA,
  MOCK_ETH_SEPOLIA,
  getContractConfig,
  getAssetByTicker,
  getAssetBySymbol,
} from "./addresses";
export type { AssetAddresses, ContractConfig, ContractMode } from "./addresses";
