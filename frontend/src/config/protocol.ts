// src/config/protocol.ts
import type { Address } from "viem";

/** ---------- Network / Chain ---------- */
export const RPC_URL = "https://testnet.rpc.intuition.systems/http";
export const CHAIN_ID = 13579;

/** ---------- Protocol addresses ---------- */
export const PROTOCOL_TREASURY = "0x39706AD971d92B51A3780623E0F1345CB2a282ee" as Address;
export const FACTORY_ADDRESS   = "0xd103E057242881214793d5A1A7c2A5B84731c75c" as Address;
export const ROUTER_ADDRESS    = "0xA90f2DC77650941a53F5e4f2F345D84f5c0dc2dd" as Address;

/** ---------- Native / Wrapped ---------- */
export const WNATIVE_ADDRESS   = "0xc82d6A5e0Da8Ce7B37330C4D44E9f069269546E6" as Address; // WTTRUST
export const WTTRUST_ADDRESS   = WNATIVE_ADDRESS; // alias

export const NATIVE_SYMBOL     = "tTRUST" as const;
export const WRAPPED_SYMBOL    = "WTTRUST" as const;
export const SHOW_WRAPPED_SYMBOL = false as const;

/** ---------- (Option) tokens test ---------- */
export const TOKEN_A = "0x124C4E8470eD201Ae896C2DF6ee7152AB7438d80" as Address;
export const TOKEN_B = "0x5Fdd4EdD250b9214D77103881bE0F09812d501D6" as Address;
export const TSWP_ADDRESS = "0x7da120065e104C085fAc6f800d257a6296549cF3" as Address;
export const PINTU_ADDRESS = "0xBC2B7FCab75987434D11f0EeBd8f47f72DFd2957" as Address;
export const SHOW_ONLY_TOKENS = '' as const;

/** ---------- Gas config ---------- */
export const FORCE_LEGACY_GAS = true as const;
export const GAS_PRICE_GWEI   = 0.2 as const;

// Helpers gas
export const gweiToWei = (gwei: number) => BigInt(Math.round(gwei * 1e9));
export const GAS_PRICE_WEI = gweiToWei(GAS_PRICE_GWEI);

// Gas limits
export const GAS_LIMIT              = 1_200_000n;
export const GAS_LIMIT_CREATE_PAIR  = 3_000_000n;

/** ---------- UI filtering (hide some tokens) ---------- */
export const HIDE_TOKENS: Address[] = [
  "0x124C4E8470eD201Ae896C2DF6ee7152AB7438d80", // TokenA
  "0x5Fdd4EdD250b9214D77103881bE0F09812d501D6", // TokenB
  "0x51379Cc2C942EE2AE2fF0BD67a7b475F0be39Dcf", // old WETH9 / WTTRUST (legacy)
] as Address[];
