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
