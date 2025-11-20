import React from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { CHAINS } from "../lib/wagmi";
import styles from "../styles/Layout.module.css";

export function NetworkSelect() {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const targetId = Number(event.target.value);
    const targetChain = CHAINS.find((c) => c.id === targetId);
    if (!targetChain) return;

    try {
      // Wait for chain switch to complete
      await switchChainAsync({ chainId: targetChain.id });

      // Hard reload to reset all React state / caches
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch chain", err);
    }
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
