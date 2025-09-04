// apps/web/src/config/sdk.ts
import type { Address } from "viem";
import { useChainId } from "wagmi";
// Selon ton SDK, adapte l'import :
import { addresses } from "@trustswap/sdk"; 
// ↑ Exemple : expose un objet { [chainId]: { ROUTER02, FACTORY, WNATIVE } }
// et un objet { [chainId]: { NATIVE_SYMBOL, WRAPPED_SYMBOL } }
// Si ton SDK expose `addresses` plat, crée une table ici (voir fallback plus bas).

export type ProtocolAddresses = {
  ROUTER02: Address;
  FACTORY: Address;
  WNATIVE: Address;
};

export type ProtocolSymbols = {
  NATIVE_SYMBOL: string;
  WRAPPED_SYMBOL: string;
};

const addressesByChain = { 9999: addresses }; // mappe-le ici
const symbolsByChain = { 9999: { NATIVE_SYMBOL: "tTRUST", WRAPPED_SYMBOL: "WTTRUST" } };

// Fallbacks (au cas où le SDK n’aurait pas encore la chaîne / pour dev offline)
const FALLBACK_ADDRESSES: Record<number, ProtocolAddresses> = {
  9999: { // Intuition testnet (exemple)
    ROUTER02: "0xAc1218b429E2BB26f5FFe635F04F7412ac40979c" as Address,
    FACTORY:  "0xd103E057242881214793d5A1A7c2A5B84731c75c" as Address,
    WNATIVE:  "0x51379Cc2C942EE2AE2fF0BD67a7b475F0be39Dcf" as Address,
  },
};

const FALLBACK_SYMBOLS: Record<number, ProtocolSymbols> = {
  9999: {
    NATIVE_SYMBOL: "tTRUST",
    WRAPPED_SYMBOL: "WTTRUST",
  },
};

export function useProtocolConfig() {
  const chainId = useChainId() ?? 9999; // Intuition testnet par défaut

  const addrs =
    addressesByChain?.[chainId] ??
    FALLBACK_ADDRESSES[chainId];

  const syms =
    symbolsByChain?.[chainId] ??
    FALLBACK_SYMBOLS[chainId];

  if (!addrs || !syms) {
    throw new Error(`Aucune config protocole pour chainId=${chainId}`);
  }

  return {
    addresses: addrs, 
    symbols: syms,
    chainId,
  } as const;
}