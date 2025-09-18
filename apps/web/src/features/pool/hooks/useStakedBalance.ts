import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { erc20Abi } from "viem";

export function useStakedBalance(stakingAddress?: Address) {
  const { address: owner } = useAccount();
  const pc = usePublicClient();
  const [balance, setBalance] = useState<bigint | null>(null);

  useEffect(() => {
    if (!pc || !owner || !stakingAddress) return;
    let cancelled = false;

    async function load() {
      try {
        const b = await pc.readContract({
          address: stakingAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [owner],
        }) as bigint;
        if (!cancelled) setBalance(b);
      } catch {
        if (!cancelled) setBalance(0n);
      }
    }

    load();
    return () => { cancelled = true };
  }, [pc, owner, stakingAddress]);

  return balance;
}
