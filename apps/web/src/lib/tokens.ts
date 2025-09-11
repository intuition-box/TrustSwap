import type { Address } from "viem";
import { INTUITION, addresses } from "@trustswap/sdk";
import { createPublicClient, http, erc20Abi } from "viem";

export const NATIVE_PLACEHOLDER = addresses.NATIVE_PLACEHOLDER as Address;
export const WNATIVE_ADDRESS   = addresses.WTTRUST as Address;


export type TokenInfo = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
  hidden?: boolean; // 👈 ajouté
};

export const TOKENLIST: TokenInfo[] = [
  {
    address: NATIVE_PLACEHOLDER,
    symbol: INTUITION?.nativeCurrency?.symbol ?? "tTRUST",
    name:   INTUITION?.nativeCurrency?.name   ?? "Native TRUST",
    decimals: 18,
    isNative: true,
  },
  {
    address: addresses.TSWP as Address,
    symbol: "TSWP",
    name: "TrustSwap",
    decimals: 18,
  },
  {
    address: WNATIVE_ADDRESS,
    symbol: "WTTRUST",
    name: "Wrapped TRUST",
    decimals: 18,
    hidden: true, // 👈 important : pas dans le selector
  },

  { address: "0x124C4E8470eD201Ae896C2DF6ee7152AB7438d80", symbol: "TKA", name: "Token A", decimals: 18 },
  { address: "0x5Fdd4EdD250b9214D77103881bE0F09812d501D6", symbol: "TKB", name: "Token B", decimals: 18 },
  { address: "0x51379Cc2C942EE2AE2fF0BD67a7b475F0be39Dcf", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },

];

const TOKEN_CACHE: Record<string, TokenInfo> = {};
for (const t of TOKENLIST) TOKEN_CACHE[t.address.toLowerCase()] = t;

const client = createPublicClient({
  chain: INTUITION,
  transport: http(INTUITION.rpcUrls?.default?.http?.[0] || ""),
});

function findToken(addr: string): TokenInfo | null {
  return TOKEN_CACHE[addr.toLowerCase()] || null;
}


export const isNative = (addr?: string) =>
  !!addr && addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

export const toWrapped = (addr: Address): Address =>
  isNative(addr) ? WNATIVE_ADDRESS : addr;

export const buildPath = (path: Address[]): Address[] =>
  path.map(toWrapped) as Address[];

export function getTokenByAddress(addr: string): TokenInfo {
  const t = TOKENLIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  if (!t) throw new Error(`Token not in tokenlist: ${addr}`);
  return t;
}

export function getDefaultPair(): { tokenIn: TokenInfo; tokenOut: TokenInfo } {
  const native = TOKENLIST.find(t => t.isNative) ?? TOKENLIST[0];
  const other  = TOKENLIST.find(t => t.address !== native.address && !t.hidden) ?? native;
  return { tokenIn: native, tokenOut: other };
}

export async function getOrFetchToken(address: Address): Promise<TokenInfo> {
  const cached = findToken(address);
  if (cached) return cached;

  const [symbol, decimals, name] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }).catch(() => "TKN"),
    client.readContract({ address, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    client.readContract({ address, abi: erc20Abi, functionName: "name" }).catch(() => "Unknown"),
  ]);

  const info: TokenInfo = {
    address,
    symbol: String(symbol),
    name: String(name),
    decimals: Number(decimals),
  };

  TOKEN_CACHE[address.toLowerCase()] = info; // ajoute au cache (pas au selector)
  return info;
}