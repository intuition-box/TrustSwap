// features/shared/hooks/useTokenMeta.ts
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { getOrFetchToken, isNative, NATIVE_PLACEHOLDER } from "../lib/tokens";

export type UIMeta = {
  address: Address;       // adresse "UI" (placeholder si natif)
  symbol: string;
  name?: string;
  decimals: number;       // 18 si natif
  isNative?: boolean;     // true si tTRUST
};

export function useTokenMeta(addr?: Address) {
  const [state, setState] = useState<{ meta?: UIMeta; loading: boolean; error?: unknown }>({
    loading: !!addr,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!addr) { if (alive) setState({ loading: false }); return; }

      try {
        if (isNative(addr)) {
          if (!alive) return;
          setState({
            loading: false,
            meta: {
              address: NATIVE_PLACEHOLDER,
              symbol: "tTRUST",
              name: "Native TRUST",
              decimals: 18,
              isNative: true,
            },
          });
          return;
        }

        const onchain = await getOrFetchToken(addr);
        if (!alive) return;
        setState({
          loading: false,
          meta: {
            address: addr,
            symbol: onchain.symbol,
            name: onchain.name,
            decimals: Number(onchain.decimals ?? 18),
          },
        });
      } catch (error) {
        if (!alive) return;
        setState({ loading: false, error });
      }
    })();

    return () => { alive = false; };
  }, [addr]);

  return state;
}
