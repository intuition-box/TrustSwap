import { useState, useMemo } from "react";
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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback (context non sécurisé, vieux navigateurs)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
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
  const [copied, setCopied] = useState(false);

  const primary = useMemo(
    () => wallets.find(w => w.walletClientType === 'privy') ?? wallets[0],
    [wallets]
  );
  
  const addr =
    primary?.address ??
    user?.wallet?.address ??
    user?.linkedAccounts?.find(a => (a as any).address)?.address;

  const shouldShowWallet =
    typeof showWalletOn === 'function'
      ? showWalletOn(label)
      : showWalletOn.map(s => s.toLowerCase()).includes(label.toLowerCase());

  const onCopy = async () => {
    if (!addr) return;
    const ok = await copyToClipboard(addr);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 600);
    }
  };

  const onKeyCopy: React.KeyboardEventHandler<HTMLSpanElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCopy();
    }
  };

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
            <span
              role="button"
              tabIndex={0}
              title={copied ? "Copied!" : "Click to copy"}
              aria-label={copied ? "Address copied" : "Copy address"}
              onClick={onCopy}
              onKeyDown={onKeyCopy}
              className={styles.walletAddress}
            >
              {copied ? "Copied!" : shortAddr(addr)}
            </span>
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

