// apps/web/src/config/sdk.ts
import type { Address } from "viem";
// Source de vérité: SDK (pas le wallet)
import { INTUITION, addresses as SDK_ADDRESSES } from "@trustswap/sdk";

// --- Types "côté app" (normalisés) ---
export type ProtocolAddresses = {
  ROUTER02: Address;
  FACTORY: Address;
  WNATIVE: Address;
  // (optionnel) expose aussi ce dont tu as besoin dans l'app:
  TSWP?: Address;
  SRF?: Address; // StakingRewardsFactory si tu l'as
};

export type ProtocolSymbols = {
  NATIVE_SYMBOL: string;
  WRAPPED_SYMBOL: string;
};

// --- Choix du chainId app ---
// Priorité à l'ENV si tu veux override, sinon SDK
const APP_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || INTUITION.id);

// --- Adaptateur: mappe les noms du SDK vers tes noms normalisés ---
function normalizeSdkAddresses(a: any): ProtocolAddresses {
  // Adapte ces clés selon ce que ton SDK expose exactement
  return {
    ROUTER02: (a.UniswapV2Router02 ?? a.ROUTER02) as Address,
    FACTORY: (a.UniswapV2Factory ?? a.FACTORY) as Address,
    WNATIVE: (a.WTTRUST ?? a.WNATIVE ?? a.WETH9) as Address,
    TSWP: a.TSWP as Address,
    SRF: (a.SRF ?? a.StakingRewardsFactory ?? a.StakingRewardsFactoryV2) as Address,
  };
}

// Si ton SDK n'est pas multi-chain, on normalise directement l'objet plat:
const FROM_SDK: ProtocolAddresses = normalizeSdkAddresses(SDK_ADDRESSES);

// Fallbacks (utile si le SDK n'est pas dispo / dev offline)
const FALLBACK_ADDRESSES: Record<number, ProtocolAddresses> = {
  13579: {
    ROUTER02: "0xAc1218b429E2BB26f5FFe635F04F7412ac40979c" as Address,
    FACTORY:  "0xd103E057242881214793d5A1A7c2A5B84731c75c" as Address,
    WNATIVE:  "0x51379Cc2C942EE2AE2fF0BD67a7b475F0be39Dcf" as Address,
    TSWP:     "0x7da120065e104C085fAc6f800d257a6296549cF3" as Address,
    // SRF: "0x819030e047cB49E9F68599433FeC5A7C32B41565" as Address, // si besoin
  },
};

// Symboles (depuis le SDK + override)
const FALLBACK_SYMBOLS: Record<number, ProtocolSymbols> = {
  13579: {
    NATIVE_SYMBOL: INTUITION.nativeCurrency.symbol || "tTRUST",
    WRAPPED_SYMBOL: "WTTRUST",
  },
};

// --- API exportée par le module ---
export function getProtocolConfig() {
  let addrs: ProtocolAddresses | undefined = FROM_SDK;

  if (!addrs?.ROUTER02 || !addrs?.FACTORY || !addrs?.WNATIVE) {
    addrs = FALLBACK_ADDRESSES[APP_CHAIN_ID];
  }
  if (!addrs) {
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
