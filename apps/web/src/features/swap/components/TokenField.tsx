import type { Address } from "viem";
import TokenSelector from "./TokenSelector";
import AmountInput from "./AmountInput";
import styles from "@ui/styles/Swap.module.css";
import walletIcone from "../../../assets/wallet-icone.png";

export default function TokenField(props: {
  label: string;
  token: Address;
  onTokenChange: (a: Address) => void;
  amount?: string;
  onAmountChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div className={styles.headerInput}>
        <span>{props.label}</span>
        <span className={styles.wallet}>
        <img src={walletIcone} alt="wallet Icone" className={styles.walletIcone} />
          0x02938...3894a
        </span>
      </div>
      <div className={styles.bodyInput}>
        <AmountInput
          value={props.amount ?? ""}
          onChange={props.onAmountChange}
          readOnly={props.readOnly}
          placeholder={props.readOnly ? "-" : "0.0"}
        />
        <TokenSelector value={props.token} onChange={props.onTokenChange} />
      </div>

      
    </div>
  );
}
