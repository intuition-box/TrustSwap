import { useMemo } from "react";


export function useTrustGauge(forShares: bigint, againstShares: bigint) {
return useMemo(() => {
const F = forShares < 0n ? 0n : forShares;
const A = againstShares < 0n ? 0n : againstShares;
const T = F + A;
if (T === 0n) {
return { ratioFor: 0, diff: 0, totalVotes: 0n };
}
const ratioFor = Number(F) / Number(T);
const diff = 2 * ratioFor - 1; // -1..+1
return { ratioFor, diff, totalVotes: T };
}, [forShares, againstShares]);
}