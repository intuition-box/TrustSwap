// useTokenBalance.ts
import type { Address } from "viem";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type TokenInfo } from "../../../lib/tokens";

import { useTokenModule } from "../../../hooks/useTokenModule";

import { useLiveRegister } from "../../../live/LiveRefetchProvider";

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
  const { NATIVE_PLACEHOLDER, getOrFetchToken, isNative } = useTokenModule();

  const [state, setState] = useState<Result>({
    isLoading: !!token && !!owner,
    refetch: async () => {},
  });

  // mémo: métadonnées du natif “synthétiques”
  const nativeMeta: TokenInfo = useMemo(
    () => ({
      address: NATIVE_PLACEHOLDER,
      symbol: "tTRUST", // ou récupère depuis INTUITION.nativeCurrency.symbol si tu préfères
      name: "Native TRUST",
      decimals: 18,
      isNative: true,
    }),
    []
  );

  const fetchOnce = useCallback(async () => {
    // guards synchrones
    if (!pc || !owner || isUnsetToken) {
      setState((s) => ({
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
      // récupère meta on-chain si besoin (ne throw pas si hors TOKENLIST)
      const meta = isNative(token!)
        ? nativeMeta
        : await getOrFetchToken(token!);

      let raw: bigint = 0n;

      if (meta.isNative || isNative(token!)) {
        raw = await pc.getBalance({ address: owner });
      } else {
        // balanceOf peut revert sur des tokens “non standard” → protège
        try {
          raw = (await pc.readContract({
            address: token!,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [owner],
          })) as bigint;
        } catch {
          raw = 0n; // fallback safe
        }
      }

      const formatted = formatUnits(raw, meta.decimals);
      setState({
        raw,
        formatted,
        decimals: meta.decimals,
        symbol: meta.symbol,
        isLoading: false,
        error: undefined,
        refetch: fetchOnce,
      });
    } catch (error) {
      // ne crashe pas l’UI : reporte l’erreur mais garde le hook vivant
      console.error("[useTokenBalance] error", { token, owner, error });
      setState((s) => ({
        ...s,
        raw: 0n,
        formatted: "0",
        decimals: 18,
        symbol: undefined,
        isLoading: false,
        error,
        refetch: fetchOnce,
      }));
    }
  }, [pc, owner, token, isUnsetToken, nativeMeta]);

  useEffect(() => {
    setState((s) => ({
      ...s,
      isLoading: !!token && !!owner && !isUnsetToken,
    }));
    void fetchOnce();
    // important: si tu changes de chain, on refetch
  }, [pc, owner, token, chain?.id, isUnsetToken, fetchOnce]);

  useLiveRegister(fetchOnce);

  return state;
}
