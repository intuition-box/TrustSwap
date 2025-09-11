// src/hooks/useTokenBalance.ts
import type { Address } from "viem";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { useAccount, usePublicClient, useWatchBlocks } from "wagmi";
import { useEffect, useState } from "react";
import { getTokenByAddress, isNative } from "../../../lib/tokens";

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
  const isUnsetToken = !token || token.toLowerCase() === zeroAddress;

  const [state, setState] = useState<Result>({
    isLoading: !!token && !!owner,
    refetch: async () => {},
  });

  async function fetchOnce() {
    if (!pc || !owner || isUnsetToken) {
      setState(s => ({ 
        ...s,
        raw: undefined,
        formatted: undefined,
        decimals: undefined,
        symbol: undefined,
        error: undefined,
        isLoading: false,
        refetch: fetchOnce,
      }));
      return;
    }
    try {
      const meta = getTokenByAddress(token); 
      console.log("[useTokenBalance] read", { token, symbol: meta.symbol, owner });

      let raw: bigint;
      if (meta.isNative || isNative(token)) {
        raw = await pc.getBalance({ address: owner });
      } else {
        raw = (await pc.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [owner],
        })) as bigint;
      }

      const formatted = formatUnits(raw, meta.decimals);
      setState({
        raw,
        formatted,
        decimals: meta.decimals,
        symbol: meta.symbol,
        isLoading: false,
        refetch: fetchOnce,
      });
    } catch (error) {
      console.error("[useTokenBalance] error", { token, owner, error });
      setState(s => ({ ...s, error, isLoading: false, refetch: fetchOnce }));
    }
  }

  useEffect(() => {
    setState(s => ({ ...s, isLoading: !!token && !!owner && !isUnsetToken, }));
    void fetchOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pc, owner, token, chain?.id]);

  useWatchBlocks({ onBlock() { if (owner && token && !isUnsetToken) void fetchOnce(); } });

  return state;
}
