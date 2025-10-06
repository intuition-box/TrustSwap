// apps/web/src/features/trust-gauge/hooks/useAtomByToken.ts
// English-only comments
import { useEffect, useMemo } from "react";
import { useGetAtomByCanonicalDataQuery } from "@0xintuition/graphql";
import { toCAIP19 } from "../caip";

export function useAtomByToken({
  chainId,
  tokenAddress,
}: {
  chainId: number;
  tokenAddress: string;
}) {
  // Build the exact URI the indexer expects (must match creation)
  const uri = useMemo(() => toCAIP19(chainId, tokenAddress), [chainId, tokenAddress]);

  const query = useGetAtomByCanonicalDataQuery(
    { uri },
    { staleTime: 60_000 }
  );

  // Normalize the first atom's term_id into a bigint (or null)
  const subjectId = useMemo(() => {
    const term = query.data?.atoms?.[0]?.term_id as string | undefined;
    if (!term) return null;
    try {
      const bn = BigInt(term);
      return bn > 0n ? bn : null;
    } catch {
      return null;
    }
  }, [query.data]);

  // Debug logs
  useEffect(() => {
    if (query.isFetching) {
      console.debug("[useAtomByToken] fetching", { uri });
    }
  }, [query.isFetching, uri]);

  useEffect(() => {
    if (query.isSuccess) {
      const atoms = query.data?.atoms ?? [];
      console.debug("[useAtomByToken] success", {
        uri,
        count: atoms.length,
        first: atoms[0],
        subjectId,
      });
      if (!atoms.length) {
        console.debug("[useAtomByToken] no atom found for URI", { uri });
      }
    }
  }, [query.isSuccess, query.data, uri, subjectId]);

  useEffect(() => {
    if (query.isError) {
      console.error("[useAtomByToken] error", { uri, error: query.error });
    }
  }, [query.isError, query.error, uri]);

  // Return compat shape for your Popover: { data: subjectId, isLoading, refetch, ... }
  return {
    data: subjectId,                   // <-- bigint | null (what your Popover expects)
    isLoading: query.isFetching || query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    uri,                               // helpful for debugging upstream
    raw: query.data,                   // optional: the raw GraphQL payload
  } as const;
}
