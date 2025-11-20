import React from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { CHAINS } from "../lib/wagmi";
import styles from "../styles/Layout.module.css";


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
      className={styles.networkSelect}
    >
      {CHAINS.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}
