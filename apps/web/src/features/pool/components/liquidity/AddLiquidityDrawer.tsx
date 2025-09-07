import { useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useLiquidityActions } from "../../hooks/useLiquidityActions";
import { TOKENLIST } from "../../../../lib/tokens";
import { getTokenIcon } from "../../../../lib/getTokenIcon";
import styles from "../../modal.module.css";

import TokenField from "../../../swap/components/TokenField";

export function AddLiquidityDrawer({
  tokenA,
  tokenB,
  onClose,
}: {
  tokenA?: Address;
  tokenB?: Address;
  onClose: () => void;
}) {
  const { address: to } = useAccount();
  const { addLiquidity } = useLiquidityActions();

  const [tokenIn, setTokenIn] = useState<Address>(tokenA ?? "");
  const [tokenOut, setTokenOut] = useState<Address>(tokenB ?? "");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");

  const infoA = TOKENLIST.find((t) => t.address === tokenIn);
  const infoB = TOKENLIST.find((t) => t.address === tokenOut);

  async function onSubmit() {
    if (!tokenIn || !tokenOut || !to) return;
    await addLiquidity(
      tokenIn,
      tokenOut,
      parseUnits(amountIn || "0", 18),
      parseUnits(amountOut || "0", 18),
      0n,
      0n,
      to,
      Math.floor(Date.now() / 1000)
    );
    onClose();
  }

  return (
    <div className={styles.bodyAddModal}>
      <div className={styles.inputAddLiquidityContainer}>
        {/* Token A */}
        <div className={styles.inputAddContainer}>
          <TokenField
            label=""
            token={tokenIn}
            onTokenChange={setTokenIn}
            amount={amountIn}
            onAmountChange={setAmountIn}
            readOnly={false}
          />
        </div>

        {/* Token B */}
        <div className={styles.inputAddContainer}>
          <TokenField
            label=""
            token={tokenOut}
            onTokenChange={setTokenOut}
            amount={amountOut}
            onAmountChange={setAmountOut}
            readOnly={false}
          />
        </div>
      </div>

      {/* Icônes flottantes */}
      {infoB && (
        <img
          src={getTokenIcon(infoB.address)}
          alt={infoB.symbol}
          className={styles.tokenImgWorLeft}
        />
      )}
      {infoA && (
        <img
          src={getTokenIcon(infoA.address)}
          alt={infoA.symbol}
          className={styles.tokenImgWorRight}
        />
      )}

      {/* Bouton Add Liquidity */}
      <div className={styles.wormholeContainer}>
        <button onClick={onSubmit} className={styles.btnAddLiquidity}>
          Add Liquidity
        </button>
      </div>
    </div>
  );
}
