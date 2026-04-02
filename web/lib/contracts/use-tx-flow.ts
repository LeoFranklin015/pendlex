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
