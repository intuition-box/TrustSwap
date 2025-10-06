// English-only comments
import { useMemo } from "react";
import { useGetTrustedListingTripleAggregatesQuery } from "@0xintuition/graphql";

export type TrustedListingData = {
  tripleId: `0x${string}` | null;
  counterTripleId: `0x${string}` | null;
  forShares: bigint;
  forVoters: number;
  againstShares: bigint;
  againstVoters: number;
  userSide: "for" | "against" | "none";
};

export function useTrustedListing(params: {
  subjectId: `0x${string}` | null;
  listedOnId: `0x${string}`;
  trustswapId: `0x${string}`;
  accountIdLower: string; // lowercase EOA
}) {
  const { subjectId, listedOnId, trustswapId, accountIdLower } = params;

  const query = useGetTrustedListingTripleAggregatesQuery(
    {
      subjectId: subjectId!,
      listedOnId,
      trustswapId,
      curveId: undefined, // or provide a valid value if available
      accountIdLower,
    },
    { enabled: Boolean(subjectId), staleTime: 30_000 }
  );

  const data = useMemo<TrustedListingData>(() => {
    const t = query.data?.triples?.[0];
    if (!t) {
      return {
        tripleId: null,
        counterTripleId: null,
        forShares: 0n,
        forVoters: 0,
        againstShares: 0n,
        againstVoters: 0,
        userSide: "none",
      };
    }

    const termVault = t.term?.vaults?.[0];
    const counterVault = t.counter_term?.vaults?.[0];

    const forShares = BigInt(
      termVault?.positions_aggregate?.aggregate?.sum?.shares ?? "0"
    );
    const forVoters = Number(
      termVault?.positions_aggregate?.aggregate?.count ?? 0
    );
    const userFor = BigInt(termVault?.positions?.[0]?.shares ?? "0");

    const againstShares = BigInt(
      counterVault?.positions_aggregate?.aggregate?.sum?.shares ?? "0"
    );
    const againstVoters = Number(
      counterVault?.positions_aggregate?.aggregate?.count ?? 0
    );
    const userAgainst = BigInt(counterVault?.positions?.[0]?.shares ?? "0");

    return {
      tripleId: t.term_id as `0x${string}`,
      counterTripleId: t.counter_term_id as `0x${string}`,
      forShares,
      forVoters,
      againstShares,
      againstVoters,
      userSide: userFor > 0n ? "for" : userAgainst > 0n ? "against" : "none",
    };
  }, [query.data]);

  return { ...query, data } as const;
}
