// src/components/DynamicConnect.tsx
import { useDisconnect as useWagmiDisconnect } from "wagmi"
import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import styles from "../styles/Layout.module.css"

export default function DynamicConnect() {
  const {
    sdkHasLoaded,
    setShowAuthFlow,     
    handleLogOut,        
    primaryWallet,       
    user,               
  } = useDynamicContext()

  const { disconnect: wagmiDisconnect } = useWagmiDisconnect()

  if (!sdkHasLoaded) return null


  async function disconnectEverywhere() {

    try {
      // @ts-ignore — selon le wallet, la méthode peut exister
      await primaryWallet?.connector?.disconnect?.()
    } catch {}

    try { wagmiDisconnect() } catch {}

    try { await handleLogOut() } catch {}

    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("wc@2") || k.includes("walletconnect"))
        .forEach((k) => localStorage.removeItem(k))
    } catch {}
  }

  if (!user) {
    return (
      <button
        onClick={() => setShowAuthFlow(true)}
        className={styles.connectWalletBtn}
      >
        <span className={styles.gradientText}>Connect Wallet</span>
      </button>
    )
  }

  return (
    <div>
      <button onClick={disconnectEverywhere} className={styles.connectWalletBtn}>
        <span className={styles.gradientText}>
          {"Disconnect"}
        </span>
      </button>
    </div>
  )
}
