// apps/web/src/features/trust-gauge/hooks/useTrustedListing.ts
// English-only comments
import { useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useGetTrustedListingTripleAggregatesQuery } from "@0xintuition/graphql";
import {
  PREDICATE_LISTED_ON_VAULT_ID,
  TRUSTSWAP_VAULT_ID,
  DEFAULT_CURVE_ID,
} from "../config";

type Listing = {
  tripleId?: `0x${string}` | null;
  counterTripleId?: `0x${string}` | null;
  forShares: bigint;
  againstShares: bigint;
  userSide?: "for" | "against" | null;
  voteFor?: number;  
  voteAgainst?: number;
};

function toBigIntSafe(x: unknown): bigint {
  try {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") return BigInt(Math.trunc(x));
    if (typeof x === "string" && x !== "") return BigInt(x);
  } catch {}
  return 0n;
}

export function useTrustedListing({
  subjectId,
  enabled = true,
  debug = true,
}: {
  subjectId: `0x${string}` | null;
  enabled?: boolean;
  debug?: boolean;
}) {
  const { address } = useAccount();
  const active = enabled && !!subjectId;

  // GraphQL variables required by your query (all non-null)
  const accountIdLower = (address ?? "").toLowerCase();
  // Some codegens for Postgres `numeric` accept number; others prefer string.
  // We pass a plain number (0). If your codegen wants a string, change to: String(DEFAULT_CURVE_ID).
  const curveId: number = Number(DEFAULT_CURVE_ID);

  const vars = active
    ? {
        subjectId: subjectId as `0x${string}`,
        listedOnId: PREDICATE_LISTED_ON_VAULT_ID, // predicate term_id
        trustswapId: TRUSTSWAP_VAULT_ID,          // object term_id (TrustSwap vault)
        curveId,                                  // numeric!
        accountIdLower,                           // string! (lowercased address; "" if not connected)
      }
    : ({} as any);

  const query = useGetTrustedListingTripleAggregatesQuery(vars, {
    enabled: active,
    staleTime: 30_000,
  });

  const data: Listing | null = useMemo(() => {
    if (!active || !query.data) return null;

    const raw = query.data as any;

    // Your query returns: triples(limit:1) { term_id, counter_term_id, term { vaults {...} }, counter_term { vaults {...} } }
    const triple = raw?.triples?.[0] ?? null;

    const voteFor = triple?.term?.positions_aggregate?.aggregate?.count;
    const voteAgainst = triple?.counter_term?.positions_aggregate?.aggregate?.count;

    // "FOR" side aggregates live under `term.vaults[0]`
    const tVault = triple?.term?.vaults?.[0];
    const forSumShares = tVault?.positions_aggregate?.aggregate?.sum?.shares ?? 0;
    const userForShares = tVault?.positions?.[0]?.shares ?? 0;

    // "AGAINST" side aggregates live under `counter_term.vaults[0]`
    const cVault = triple?.counter_term?.vaults?.[0];
    const againstSumShares = cVault?.positions_aggregate?.aggregate?.sum?.shares ?? 0;
    const userAgainstShares = cVault?.positions?.[0]?.shares ?? 0;

    const forShares = toBigIntSafe(forSumShares);
    const againstShares = toBigIntSafe(againstSumShares);

    const tripleId = (triple?.term_id ?? null) as `0x${string}` | null;
    const counterTripleId = (triple?.counter_term_id ?? null) as `0x${string}` | null;

    const userFor = toBigIntSafe(userForShares);
    const userAgainst = toBigIntSafe(userAgainstShares);
    const userSide = userFor > 0n ? "for" : userAgainst > 0n ? "against" : null;

    if (debug && import.meta.env.DEV) {
      console.log("[useTrustedListing] map", {
        vars,
        tripleKeys: triple ? Object.keys(triple) : null,
        voteFor,
        voteAgainst,
        forSumShares,
        againstSumShares,
        userForShares,
        userAgainstShares,
        mapped: { tripleId, counterTripleId, forShares, againstShares, userSide },
      });
    }

    return { tripleId, counterTripleId, forShares, voteFor, againstShares, voteAgainst, userSide };
  }, [active, query.data, debug]);

  useEffect(() => {
    if (!debug || !import.meta.env.DEV) return;
    console.log("[useTrustedListing] inputs", { subjectId, enabled, vars });
  }, [subjectId, enabled, debug, vars]);

  useEffect(() => {
    if (!debug || !import.meta.env.DEV) return;
    if (query.isFetching) console.log("[useTrustedListing] fetching", { vars });
    if (query.isSuccess) console.log("[useTrustedListing] success raw", query.data);
    if (query.isError)   console.error("[useTrustedListing] error", { vars, error: query.error });
  }, [query.isFetching, query.isSuccess, query.isError, query.data, query.error, vars, debug]);

  return {
    data,
    isLoading: query.isLoading || query.isFetching,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  } as const;
}
