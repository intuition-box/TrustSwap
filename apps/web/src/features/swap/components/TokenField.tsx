import { useState, useMemo } from "react"
import type { Address } from "viem"
import { useAccount } from "wagmi"
import { usePoolsData } from "../../pool/hooks/usePoolsData";
import { useDynamicTokenList } from "../hooks/useDynamicTokenList";
import TokenSelector from "./TokenSelector"
import AmountInput from "./AmountInput"
import styles from "@ui/styles/Swap.module.css"
import walletIcone from "../../../assets/wallet-icone.png"
import TokenBalanceBadge from "./TokenBalanceBadge"

type TokenFieldProps = {
  label: string
  token?: Address | ""   
  onTokenChange: (a: Address) => void
  amount?: string
  onAmountChange?: (v: string) => void
  readOnly?: boolean
  showWalletOn?: string[] | ((label: string) => boolean)
}

function shortAddr(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ""
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  }
}

export default function TokenField({
  label,
  token,
  onTokenChange,
  amount,
  onAmountChange,
  readOnly,
  showWalletOn = ["From"],
}: TokenFieldProps) {
  // ← DynamicWagmiConnector alimente wagmi : on récupère juste l'adresse connectée
  const { address: accountAddress, isConnected } = useAccount()
  const [copied, setCopied] = useState(false)
  
  const pools = usePoolsData(); 
  const dynTokens = useDynamicTokenList(pools);
  const uiTokens  = dynTokens.filter(t => !t.hidden);  

  // Validation d'adresse (0x + 40 hex) avant cast en Address
  const owner: Address | undefined = useMemo(() => {
    return /^0x[a-fA-F0-9]{40}$/.test(accountAddress ?? "")
      ? (accountAddress as Address)
      : undefined
  }, [accountAddress])

  const shouldShowWallet =
    typeof showWalletOn === "function"
      ? showWalletOn(label)
      : showWalletOn.map((s) => s.toLowerCase()).includes(label.toLowerCase())

  const onCopy = async () => {
    if (!accountAddress) return
    const ok = await copyToClipboard(accountAddress)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 600)
    }
  }

  const onKeyCopy: React.KeyboardEventHandler<HTMLSpanElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onCopy()
    }
  }

  return (
    <div>
      <div className={styles.headerInput}>
        <span>{label}</span>

        {shouldShowWallet && isConnected && owner && (
          <span className={styles.wallet}>
            <img src={walletIcone} alt="wallet" className={styles.walletIcone} />
            <span
              role="button"
              tabIndex={0}
              title={copied ? "Copied!" : "Click to copy"}
              aria-label={copied ? "Address copied" : "Copy address"}
              onClick={onCopy}
              onKeyDown={onKeyCopy}
              className={styles.walletAddress}
            >
              {copied ? "Copied!" : shortAddr(owner)}
            </span>
          </span>
        )}
      </div>

      <div className={styles.bodyInput}>
        <AmountInput
          value={amount ?? ""}
          onChange={onAmountChange ?? (() => {})}
          readOnly={readOnly}
          placeholder={readOnly ? "-" : "0.00000"}
        />

        <TokenSelector value={token ?? ""} onChange={onTokenChange} tokens={uiTokens} />
      </div>

      <div className={styles.bodyBalance}>
        <span className={styles.balance}>
          <span className={styles.dollarFont}>$</span>
          <span className={styles.valueBalance}>1700.93</span>
        </span>

        <TokenBalanceBadge
          key={token}
          token={token}
          owner={owner}
          onClickMax={(val) => onAmountChange?.(val)}
        />
      </div>
    </div>
  )
}
