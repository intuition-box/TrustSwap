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
    hidden: true,
  },
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

export function getTokenByAddress(addr: string | Address): TokenInfo {
  const t = TOKENLIST.find(
    t => t.address.toLowerCase() === addr.toLowerCase()
  );
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

  TOKEN_CACHE[address.toLowerCase()] = info; 
  return info;
}

export const isWrapped = (addr?: string) =>
  !!addr && addr.toLowerCase() === WNATIVE_ADDRESS.toLowerCase();

/** Adresse à afficher en UI: WTTRUST → tTRUST (placeholder) */
export const toUIAddress = (addr?: Address): Address | undefined =>
  !addr ? undefined : isWrapped(addr) ? NATIVE_PLACEHOLDER : addr;

/** Liste de tokens pour l'UI (on masque les hidden = WTTRUST) */
export function toUIList(list: TokenInfo[]): TokenInfo[] {
  return list.filter(t => !t.hidden);
}

/** Récupérer un TokenInfo pour affichage, en tenant compte du mapping UI */
export function getTokenForUI(addr?: Address): TokenInfo | null {
  if (!addr) return null;
  const uiAddr = toUIAddress(addr)!;
  const t = TOKENLIST.find(x => x.address.toLowerCase() === uiAddr.toLowerCase());
  return t ?? null;
}


export async function getTokenMetaSafe(addr: Address): Promise<TokenInfo> {
  // natif
  if (isNative(addr)) {
    return {
      address: NATIVE_PLACEHOLDER,
      symbol: INTUITION?.nativeCurrency?.symbol ?? "tTRUST",
      name:   INTUITION?.nativeCurrency?.name   ?? "Native TRUST",
      decimals: 18,
      isNative: true,
    };
  }
  // cache/local list
  const cached = TOKEN_CACHE[addr.toLowerCase()];
  if (cached) return cached;

  // on-chain (ne throw pas — a déjà des catchs)
  return await getOrFetchToken(addr);
}

export function getTokenByAddressOrFallback(addr: Address): TokenInfo {
  const hit = TOKENLIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
  if (hit) return hit;

  // fallback neutre: ne JAMAIS throw côté UI
  return {
    address: addr,
    symbol: "UNK",
    name: "Unknown",
    decimals: 18,
  };
}
