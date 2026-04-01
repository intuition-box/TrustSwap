import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { Address } from "viem";

export type SwapToken = {
  address: Address;
  symbol: string;
  decimals: number;
};

type SwapContextValue = {
  tokenIn: SwapToken | null;
  tokenOut: SwapToken | null;
  pairAddress: Address | null;

  setTokenIn: (token: SwapToken | null) => void;
  setTokenOut: (token: SwapToken | null) => void;
  setPairAddress: (addr: Address | null) => void;
};

const SwapContext = createContext<SwapContextValue | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
  const [tokenIn, setTokenInState] = useState<SwapToken | null>(null);
  const [tokenOut, setTokenOutState] = useState<SwapToken | null>(null);
  const [pairAddress, setPairAddressState] = useState<Address | null>(null);

  const setTokenIn = useCallback((token: SwapToken | null) => {
    setTokenInState(token);
  }, []);

  const setTokenOut = useCallback((token: SwapToken | null) => {
    setTokenOutState(token);
  }, []);

  const setPairAddress = useCallback((addr: Address | null) => {
    setPairAddressState(addr);
  }, []);

  const value = useMemo(
    () => ({
      tokenIn,
      tokenOut,
      pairAddress,
      setTokenIn,
      setTokenOut,
      setPairAddress,
    }),
    [tokenIn, tokenOut, pairAddress, setTokenIn, setTokenOut, setPairAddress],
  );

  return <SwapContext.Provider value={value}>{children}</SwapContext.Provider>;
}

export function useSwapContext() {
  const ctx = useContext(SwapContext);
  if (!ctx) {
    throw new Error("useSwapContext must be used inside a SwapProvider");
  }
  return ctx;
}
