import type { Address } from "viem";
import TokenSelector from "./TokenSelector";
import AmountInput from "./AmountInput";
import styles from "@ui/styles/Swap.module.css";
import walletIcone from "../../../assets/wallet-icone.png";
import { usePrivy, useWallets } from '@privy-io/react-auth';

type TokenFieldProps = {
  label: string;
  token: Address;
  onTokenChange: (a: Address) => void;
  amount?: string;
  onAmountChange?: (v: string) => void;
  readOnly?: boolean;

  showWalletOn?: string[] | ((label: string) => boolean);
};

function shortAddr(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export default function TokenField({
  label,
  token,
  onTokenChange,
  amount,
  onAmountChange,
  readOnly,
  showWalletOn = ['From'],
}: TokenFieldProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const primary = wallets.find(w => w.walletClientType === 'privy') ?? wallets[0];
  const addr =
    primary?.address ??
    user?.wallet?.address ??
    user?.linkedAccounts?.find(a => (a as any).address)?.address;

  const shouldShowWallet =
    typeof showWalletOn === 'function'
      ? showWalletOn(label)
      : showWalletOn.map(s => s.toLowerCase()).includes(label.toLowerCase());

  return (
    <div>
      <div className={styles.headerInput}>
        <span>{label}</span>

        {shouldShowWallet && addr && (
          <span className={styles.wallet}>
            <img
              src={walletIcone}
              alt="wallet"
              className={styles.walletIcone}
            />
            <span>{shortAddr(addr)}</span>
          </span>
        )}
      </div>

      <div className={styles.bodyInput}>
        <AmountInput
          value={amount ?? ""}
          onChange={onAmountChange}
          readOnly={readOnly}
          placeholder={readOnly ? "-" : "0.0"}
        />
        <TokenSelector value={token} onChange={onTokenChange} />
      </div>
    </div>
  );
}

