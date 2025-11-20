// apps/web/src/config/sdk.ts
import type { Address } from "viem";
import {
  INTUITION,
  INTUITION_MAINNET,
  INTUITION_TESTNET,
  getAddresses,
} from "@trustswap/sdk";

// --- Types "côté app" (normalisés) ---
export type ProtocolAddresses = {
  ROUTER02: Address;
  FACTORY: Address;
  WNATIVE: Address;
  TSWP?: Address;
  SRF?: Address;
};

export type ProtocolSymbols = {
  NATIVE_SYMBOL: string;
  WRAPPED_SYMBOL: string;
};

// --- Choix du chainId app ---
// ENV > sinon on prend le chain du SDK (INTUITION = "courant")
const APP_CHAIN_ID =
  Number(import.meta.env.VITE_CHAIN_ID || INTUITION.id);

// --- Adaptateur: mappe les noms du SDK vers tes noms normalisés ---
function normalizeSdkAddresses(a: any): ProtocolAddresses {
  return {
    ROUTER02: (a.UniswapV2Router02 ?? a.ROUTER02) as Address,
    FACTORY:  (a.UniswapV2Factory  ?? a.FACTORY)  as Address,
    // wrapped: WTRUST sur mainnet, WTTRUST sur testnet, WNATIVE/WETH9 en fallback
    WNATIVE:  (a.WTRUST ?? a.WTTRUST ?? a.WNATIVE ?? a.WETH9) as Address,
    TSWP:     a.TSWP as Address,
    SRF:      (a.SRF ?? a.StakingRewardsFactory ?? a.StakingRewardsFactoryV2) as Address,
  };
}

// Fallbacks explicites si jamais getAddresses ne connaît pas encore la chain
const FALLBACK_ADDRESSES: Record<number, ProtocolAddresses> = {
  // 🔹 Intuition Testnet
  [INTUITION_TESTNET.id]: {
    ROUTER02: "0xAc1218b429E2BB26f5FFe635F04F7412ac40979c" as Address,
    FACTORY:  "0xd103E057242881214793d5A1A7c2A5B84731c75c" as Address,
    WNATIVE:  "0x51379Cc2C942EE2AE2fF0BD67a7b475F0be39Dcf" as Address,
    TSWP:     "0x7da120065e104C085fAc6f800d257a6296549cF3" as Address,
  },

  // 🔹 Intuition Mainnet
  [INTUITION_MAINNET.id]: {
    ROUTER02: "0x5123208Aa3C6A37615327a8c479a5e1654c0200E" as Address,
    FACTORY:  "0x83E9f4E539eb343F7F67d130a484c8a1b6555458" as Address,
    WNATIVE:  "0x81cFb09cb44f7184Ad934C09F82000701A4bF672" as Address, // WTRUST
    // TSWP: "0x...." as Address, // quand tu le lances
  },
};

// Symboles (depuis le SDK + override par chain)
const FALLBACK_SYMBOLS: Record<number, ProtocolSymbols> = {
  [INTUITION_TESTNET.id]: {
    NATIVE_SYMBOL: INTUITION_TESTNET.nativeCurrency.symbol || "tTRUST",
    WRAPPED_SYMBOL: "WTTRUST",
  },
  [INTUITION_MAINNET.id]: {
    NATIVE_SYMBOL: INTUITION_MAINNET.nativeCurrency.symbol || "TRUST",
    WRAPPED_SYMBOL: "WTRUST",
  },
};

// --- API exportée par le module ---
export function getProtocolConfig() {
  let addrs: ProtocolAddresses | undefined;

  try {
    const sdkAddrs = getAddresses(APP_CHAIN_ID);
    addrs = normalizeSdkAddresses(sdkAddrs);
  } catch {
    // si le SDK ne connaît pas encore la chain -> fallback local
    addrs = FALLBACK_ADDRESSES[APP_CHAIN_ID];
  }

  if (!addrs?.ROUTER02 || !addrs?.FACTORY || !addrs?.WNATIVE) {
    throw new Error(`Aucune config protocole pour chainId=${APP_CHAIN_ID}`);
  }

  const syms =
    FALLBACK_SYMBOLS[APP_CHAIN_ID] ?? {
      NATIVE_SYMBOL: INTUITION.nativeCurrency.symbol || "tTRUST",
      WRAPPED_SYMBOL: "WTTRUST",
    };

  return {
    chainId: APP_CHAIN_ID,
    addresses: addrs,
    symbols: syms,
  } as const;
}
