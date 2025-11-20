// web/src/hooks/useTokenMeta.ts
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useTokenModule } from "./useTokenModule";

export type UIMeta = {
  address: Address;
  symbol: string;
  name?: string;
  decimals: number;
  isNative?: boolean;
};

export function useTokenMeta(addr?: Address) {
  const { getTokenMetaSafe } = useTokenModule();

  const [state, setState] = useState<{
    meta?: UIMeta;
    loading: boolean;
    error?: unknown;
  }>({
    loading: !!addr,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!addr) {
        if (alive) setState({ loading: false });
        return;
      }

      try {
        const info = await getTokenMetaSafe(addr);
        if (!alive) return;

        setState({
          loading: false,
          meta: {
            address: info.address,
            symbol: info.symbol,
            name: info.name,
            decimals: info.decimals,
            isNative: info.isNative,
          },
        });
      } catch (error) {
        if (!alive) return;
        setState({ loading: false, error });
      }
    })();

    return () => {
      alive = false;
    };
  }, [addr, getTokenMetaSafe]);

  return state;
}
