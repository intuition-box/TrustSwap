// apps/web/src/features/tokens/useDynamicTokenList.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import {
  TOKENLIST,
  getOrFetchToken,
  type TokenInfo,
  WNATIVE_ADDRESS,
} from "../../../lib/tokens";

const low = (s: string) => s.toLowerCase();
const ZERO = "0x0000000000000000000000000000000000000000";
const isHexAddr = (x: unknown): x is Address =>
  typeof x === "string" && /^0x[a-fA-F0-9]{40}$/.test(x);

// Normalise différentes formes possibles
function normalizePools(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.items)) return input.items;
  if (Array.isArray(input.data)) return input.data;
  if (Array.isArray(input.pools)) return input.pools;
  if (Array.isArray(input.edges)) return input.edges.map((e: any) => e?.node ?? e);
  if (input.data && Array.isArray(input.data.pools)) return input.data.pools;
  return [];
}

// Essaie toutes les clés usuelles
function pickTokenAddr(p: any, key: "token0" | "token1"): Address | undefined {
  const kAddr = key + "Address";
  // 1) token0 / token1 directement en string
  if (isHexAddr(p?.[key])) return p[key];
  // 2) token0Address / token1Address
  if (isHexAddr(p?.[kAddr])) return p[kAddr];
  // 3) token0.address / token1.address (objets)
  if (isHexAddr(p?.[key]?.address)) return p[key].address;
  return undefined;
}

export function useDynamicTokenList(rawPools: any) {
  const base = useMemo(() => TOKENLIST, []);
  const [tokens, setTokens] = useState<TokenInfo[]>(base);
  const inFlight = useRef<Set<string>>(new Set());

  const pools = useMemo(() => normalizePools(rawPools), [rawPools]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Si pas de pools → garde la base (utile au premier render)
      if (!pools || pools.length === 0) {
        setTokens(base);
        return;
      }

      // Index existant
      const map = new Map<string, TokenInfo>();
      for (const t of base) map.set(low(t.address), t);

      // Récupère toutes les adresses vues
      const addrs: Address[] = [];
      for (const p of pools) {
        const a0 = pickTokenAddr(p, "token0");
        const a1 = pickTokenAddr(p, "token1");
        if (a0 && a0 !== ZERO) addrs.push(a0);
        if (a1 && a1 !== ZERO) addrs.push(a1);
      }

      if (addrs.length === 0) {
        setTokens(Array.from(map.values()));
        return;
      }

      // Dédupe + exclure déjà connus + éviter les fetchs en vol
      const uniq = Array.from(new Set(addrs.map(a => low(a))));
      const toFetch = uniq.filter(a => !map.has(a) && !inFlight.current.has(a));
      toFetch.forEach(a => inFlight.current.add(a));

      try {
        const fetched = await Promise.all(
          toFetch.map(async (a) => {
            try {
              const info = await getOrFetchToken(a as Address);
              return info;
            } catch {
              return null; 
            }
          })
        );

        for (const f of fetched) {
          if (f && !map.has(low(f.address))) {
            const hidden = low(f.address) === low(WNATIVE_ADDRESS); // masque WTTRUST si besoin
            map.set(low(f.address), hidden ? { ...f, hidden: true } : f);
          }
        }

        // Ajoute aussi les tokens déjà présents dans base
        for (const t of base) {
          if (!map.has(low(t.address))) map.set(low(t.address), t);
        }
      } finally {
        toFetch.forEach(a => inFlight.current.delete(a));
      }

      if (!cancelled) setTokens(Array.from(map.values()));
    }

    run();
    return () => { cancelled = true; };
  }, [pools, base]);

  return tokens;
}
