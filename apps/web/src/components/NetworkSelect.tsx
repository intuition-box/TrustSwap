import React from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { CHAINS } from "../lib/wagmi";

export function NetworkSelect() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const targetId = Number(event.target.value);
    const targetChain = CHAINS.find((c) => c.id === targetId);
    if (!targetChain) return;
    switchChain({ chainId: targetChain.id });
  };

  return (
    <select
      value={chainId}
      onChange={handleChange}
      className="rounded-md border px-2 py-1 text-sm bg-transparent"
    >
      {CHAINS.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}
