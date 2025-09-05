// src/hooks/useTokenBalance.ts
import type { Address } from "viem";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, usePublicClient, useWatchBlocks } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { NATIVE_PLACEHOLDER, NATIVE_SYMBOL } from "../../../lib/native";

type Result = {
  raw?: bigint;
  formatted?: string;
  decimals?: number;
  symbol?: string;
  isLoading: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

export function useTokenBalance(token?: Address, owner?: Address): Result {
  const { chain } = useAccount();
  const pc = usePublicClient();
  const [state, setState] = useState<Result>({ isLoading: !!token && !!owner, refetch: async () => {} });

  const isNative = useMemo(() => {
    if (!token) return false;
    return token.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();
  }, [token]);

  async function fetchOnce() {
    if (!pc || !owner || !token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    try {
      if (isNative) {
        const raw = await pc.getBalance({ address: owner });
        const decimals = 18;
        const formatted = formatUnits(raw, decimals);
        setState({
          raw, decimals, formatted,
          symbol: NATIVE_SYMBOL,
          isLoading: false,
          refetch: fetchOnce,
        });
      } else {
        // Multicall: balanceOf + decimals + symbol
        const [raw, decimals, symbol] = await pc.multicall({
          allowFailure: false,
          contracts: [
            { address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] },
            { address: token, abi: erc20Abi, functionName: "decimals" },
            { address: token, abi: erc20Abi, functionName: "symbol" },
          ],
        });
        const formatted = formatUnits(raw as bigint, decimals as number);
        setState({
          raw: raw as bigint,
          decimals: decimals as number,
          formatted,
          symbol: symbol as string,
          isLoading: false,
          refetch: fetchOnce,
        });
      }
    } catch (error) {
      setState(s => ({ ...s, error, isLoading: false, refetch: fetchOnce }));
    }
  }

  useEffect(() => {
    setState(s => ({ ...s, isLoading: !!token && !!owner }));
    void fetchOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pc, owner, token, chain?.id, isNative]);

  // Refresh on every new block
  useWatchBlocks({
    onBlock() {
      void fetchOnce();
    },
  });

  return state;
}
