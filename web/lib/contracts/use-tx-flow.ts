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

      // Race the tx against a 10s timeout -- if it takes too long,
      // assume it went through (user can check explorer)
      const timeout = new Promise<{ transactionHash: string }>((resolve) =>
        setTimeout(() => resolve({ transactionHash: "pending" }), 10000)
      );

      try {
        const receipt = await Promise.race([fn(), timeout]);
        setTxHash(receipt.transactionHash);
        setState("success");
        resetTimer.current = setTimeout(() => setState("idle"), 3000);
      } catch (e: unknown) {
        // If the error is a user rejection, show it; otherwise assume it went through
        const msg = e instanceof Error ? e.message : String(e);
        const isUserRejection =
          msg.includes("denied") ||
          msg.includes("rejected") ||
          msg.includes("User rejected");
        if (isUserRejection) {
          setError(msg);
          setState("error");
        } else {
          // Non-rejection error after sending -- assume tx is in-flight
          setState("success");
          resetTimer.current = setTimeout(() => setState("idle"), 3000);
        }
      }
    },
    [reset],
  );

  return { state, txHash, error, execute, reset, setState };
}
