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
  const uri = useMemo(() => toCAIP19(chainId, tokenAddress), [chainId, tokenAddress]);

  const query = useGetAtomByCanonicalDataQuery({ uri }, { staleTime: 60_000 });

  // Keep the term_id as a hex string for GraphQL compatibility
  const termId = useMemo(
    () => (query.data?.atoms?.[0]?.term_id as `0x${string}` | undefined) ?? null,
    [query.data]
  );

  useEffect(() => {
    console.log("[useAtomByToken] mount/update", { chainId, tokenAddress, uri });
  }, [chainId, tokenAddress, uri]);

  useEffect(() => {
    if (query.isFetching) console.log("[useAtomByToken] fetching", { uri });
  }, [query.isFetching, uri]);

  useEffect(() => {
    if (query.isSuccess) {
      const atoms = query.data?.atoms ?? [];
      console.log("[useAtomByToken] success", { uri, count: atoms.length, first: atoms[0], termId });
    }
    if (query.isError) console.error("[useAtomByToken] error", { uri, error: query.error });
  }, [query.isSuccess, query.isError, query.data, query.error, uri, termId]);

  return {
    data: termId,                 // <-- string | null
    isLoading: query.isFetching || query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    uri,
    raw: query.data,
  } as const;
}
