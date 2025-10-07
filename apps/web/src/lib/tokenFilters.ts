// apps/web/src/lib/tokenFilters.ts
import type { Address } from "viem";

export type TokenMeta = {
  address?: Address;
  symbol: string;
  decimals?: number;
  isNative?: boolean;  // ex: tTRUST
  tags?: string[];     // ex: ["test", "scam"]
  status?: "active" | "test" | "deprecated" | "blocked";
};

function addr(a?: Address | string | null) {
  return (a ?? "").toString().toLowerCase();
}


const DENY_TOKEN_ADDRESSES: string[] = [
  //"0x124c4e8470ed201ae896c2df6ee7152ab7438d80", 
  //"0x5fdd4edd250b9214d77103881be0f09812d501d6", 

  //"0x51379cc2c942ee2ae2ff0bd67a7b475f0be39dcf", 
];

const DENY_SYMBOLS: string[] = [
  // "TEST", "MOCK",
];

const DENY_TAGS: string[] = [
  "test",
  // "scam", "devonly",
];


export const HIDDEN_TOKEN_ADDRESSES = new Set<string>(
  DENY_TOKEN_ADDRESSES.map((s) => s.toLowerCase())
);
export const HIDDEN_SYMBOLS = new Set<string>(
  DENY_SYMBOLS.map((s) => s.toUpperCase())
);
export const HIDDEN_TAGS = new Set<string>(
  DENY_TAGS.map((s) => s.toLowerCase())
);


type FilterOpts = {
  includeTest?: boolean;  
  allowImported?: boolean; 
  importedAddresses?: Set<string>;  
};

export function shouldHideToken(t: TokenMeta, opts?: FilterOpts) {
  if (!t) return true;

  if (t.isNative) return false;

  const a = addr(t.address);

  if (opts?.allowImported && a && opts.importedAddresses?.has(a)) {
    return false;
  }

  if (a && HIDDEN_TOKEN_ADDRESSES.has(a)) return true;

  if (t.symbol && HIDDEN_SYMBOLS.has(t.symbol.toUpperCase())) return true;

  const tags = (t.tags ?? []).map((x) => x.toLowerCase());
  const flaggedTest =
    tags.some((tag) => HIDDEN_TAGS.has(tag)) ||
    t.status === "test" ||
    t.status === "blocked";

  if (flaggedTest && !opts?.includeTest) return true;

  return false;
}

export function shouldHidePair(t0: TokenMeta, t1: TokenMeta, opts?: FilterOpts) {
  return shouldHideToken(t0, opts) || shouldHideToken(t1, opts);
}
