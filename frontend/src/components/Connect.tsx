import { useAccount, useConnect, useDisconnect, usePublicClient } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Address } from 'viem'
import { erc20Abi, formatUnits } from 'viem'
import { TOKENS } from '../tokens/intuit'
import styles from "../styles/connect.module.css"
import metamask from '../images/metamask.png'
import refresh from '../images/rafraichir.png'
import disconnectLogo from '../images/disconnect.png'

type UiToken = {
  symbol: string
  decimals: number
  isNative?: boolean
  address?: Address
  wrapped?: Address
}

function WalletTokens({ address }: { address: Address }) {
  const publicClient = usePublicClient()
  const [rows, setRows] = useState<Array<{symbol:string; balance:bigint; decimals:number; address?:Address}>>([])
  const [hideZero, setHideZero] = useState(true)
  const display = useMemo(() => rows.filter(r => !hideZero || r.balance > 0n), [rows, hideZero])

  const load = async () => {
    if (!publicClient) return
    const out: Array<{symbol:string; balance:bigint; decimals:number; address?:Address}> = []
    for (const t of TOKENS as UiToken[]) {
      try {
        if (t.isNative) {
          const bal = await publicClient.getBalance({ address })
          out.push({ symbol: t.symbol, balance: bal, decimals: t.decimals })
        } else if (t.address) {
          const bal = await publicClient.readContract({
            address: t.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address]
          }) as bigint
          out.push({ symbol: t.symbol, balance: bal, decimals: t.decimals, address: t.address })
        }
      } catch (e) {
        console.warn('[WalletTokens] read failed for', t.symbol, e)
      }
    }
    setRows(out)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 12000)
    return () => clearInterval(id)
  }, [publicClient, address])

  return (
    <div>
      <div className={styles.walletHeader}>
        <span className={styles.labelWallet}>My tokens</span>
        <label className={styles.balanceZero}>
          <input type="checkbox" checked={hideZero} onChange={e=>setHideZero(e.target.checked)} />
          Hide zero balances
        </label>
        <button className={styles.btnRefresh} onClick={load}>
        <img src={refresh} alt="Logo" className={styles.refreshLogo}/>
        </button>
      </div>

      <div className={styles.tokenList}>
        {display.length === 0 && <div>You don’t have any tokens to display.</div>}
        {display.map(({symbol, balance, decimals}) => (
          <div key={symbol} className={styles.tokenWallet}>
            <span className={styles.tokenWalletText}>{symbol}:</span>
            <span className={styles.tokenWalletBalance}>{Number(formatUnits(balance, decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Connect() {
  const { isConnected, address } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)

  // Fermer le dropdown si clic à l’extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isOutsideContainer = !target.closest(`.${styles.connectContainer}`);
      const isOutsideDropdown = !target.closest(`.${styles.dropMenu}`);
      if (isOutsideContainer && isOutsideDropdown) {
        setOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  

  const btnClass = isConnected
    ? `${styles.btnConnect} ${styles.connected}`
    : styles.btnConnect

if (!isConnected) {
  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className={btnClass}
      style={{
        position: 'relative', // nécessaire pour z-index
        zIndex: 10000,        // supérieur à l’overlay
      }}
    >
      <img src={metamask} alt="Logo" className={styles.metamaskConnectLogo}/>
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}


  return (
    <div className={styles.connectContainer}>
      <button
        onClick={() => setOpen(!open)}
        className={btnClass}
      >
        <img src={metamask} alt="Logo" className={styles.metamaskConnectLogo}/>
        <span className={styles.addressWallet}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
      </button>

      {open && createPortal(
        <>
          {/* Overlay flou pour le reste de la page */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 9998,
            }}
          />
          {/* Dropdown */}
          <div
            className={styles.dropMenu}
            style={{
              position: 'fixed',
              top: '90px',
              right: '33px',
              zIndex: 9999,
              maxWidth: '350px',
            }}
          >
            <div className={styles.dropMenuContainer}>
              {address && <WalletTokens address={address} />}
              <button
                onClick={() => { disconnect(); setOpen(false) }}
                className={styles.disconnectBtn}
              >
                Disconnect
                <img src={disconnectLogo} alt="Logo"  className={styles.logoDisconnect}/>

              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
