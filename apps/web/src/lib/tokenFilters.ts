import type { Address } from "viem";

export type TokenMeta = {
  address?: Address;
  symbol: string;
  decimals?: number;
  isNative?: boolean;
  // facultatif si tu as déjà des tags/status dans ta tokenlist:
  tags?: string[];                  // ex: ["test", "scam"]
  status?: "active" | "test" | "deprecated" | "blocked";
};

const envDenyTokens = (import.meta.env.VITE_DENY_TOKENS ?? "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const envDenySymbols = (import.meta.env.VITE_DENY_SYMBOLS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// ✅ listes “centrales” faciles à éditer
export const HIDDEN_TOKEN_ADDRESSES = new Set<string>([
  ...envDenyTokens,
  // "0xabc...".toLowerCase(),
]);

export const HIDDEN_SYMBOLS = new Set<string>([
  ...envDenySymbols,
  // "TEST", "MOCK"
]);

export const HIDDEN_TAGS = new Set<string>([
  "test",
  // "scam", "devonly"
]);

function addr(a?: Address | string | null) {
  return (a ?? "").toString().toLowerCase();
}

type FilterOpts = {
  includeTest?: boolean;            // si true, n’applique pas le filtre “test”
  allowImported?: boolean;          // si true, un token importé peut passer malgré denylist
  importedAddresses?: Set<string>;  // adresses (lowercase) importées par l’utilisateur
};

export function shouldHideToken(
  t: TokenMeta,
  opts?: FilterOpts
) {
  if (!t) return true;

  // ne jamais cacher la native (ex: tTRUST)
  if (t.isNative) return false;

  const a = addr(t.address);

  // override pour tokens importés manuellement
  if (opts?.allowImported && a && opts.importedAddresses?.has(a)) {
    return false;
  }

  if (a && HIDDEN_TOKEN_ADDRESSES.has(a)) return true;
  if (t.symbol && HIDDEN_SYMBOLS.has(t.symbol.toUpperCase())) return true;

  const tags = (t.tags ?? []).map(x => x.toLowerCase());
  const flaggedTest = tags.some(tag => HIDDEN_TAGS.has(tag)) || t.status === "test" || t.status === "blocked";
  if (flaggedTest && !opts?.includeTest) return true;

  return false;
}

export function shouldHidePair(
  t0: TokenMeta,
  t1: TokenMeta,
  opts?: FilterOpts
) {
  return shouldHideToken(t0, opts) || shouldHideToken(t1, opts);
}
