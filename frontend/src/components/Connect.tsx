// src/components/Connect.tsx
import { useAccount, useConnect, useDisconnect, usePublicClient } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useEffect, useMemo, useState, useRef } from 'react'
import type { Address } from 'viem'
import { erc20Abi, formatUnits } from 'viem'
import { TOKENS } from '../tokens/intuit'
import styles from "../styles/connect.module.css"
import metamask from '../images/metamask.png'

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
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <strong>My tokens</strong>
        <label style={{fontSize:12, display:'flex', alignItems:'center', gap:6}}>
          <input type="checkbox" checked={hideZero} onChange={e=>setHideZero(e.target.checked)} />
          Masquer soldes à 0
        </label>
        <button onClick={load} style={{marginLeft:'auto', fontSize:12}}>Actualiser</button>
      </div>

      <div className={styles.tokenList}>
      {display.length === 0 && <div>You don’t have any tokens to display.</div>}
        {display.map(({symbol, balance, decimals}) => (
          <div key={symbol} className={styles.tokenWallet}>
            <span>{symbol}</span>
            <span>{Number(formatUnits(balance, decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Fermer le dropdown si clic à l’extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const btnClass = isConnected
    ? `${styles.btnConnect} ${styles.connected}`
    : styles.btnConnect

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        className={btnClass}
      >
        <img src={metamask} alt="Logo"  className={styles.metamaskConnectLogo}/>
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
    )
  }

  return (
    <div className={styles.connectContainer} ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={btnClass}
      >
         <img src={metamask} alt="Logo"  className={styles.metamaskConnectLogo}/>
        <span className={styles.addressWallet}> {address?.slice(0, 6)}...{address?.slice(-4)}</span>
      </button>

      {open && (
        <div className={styles.dropMenu}>
          <div className={styles.dropMenuContainer}>
          {address && <WalletTokens address={address} />}
          <button
            onClick={() => { disconnect(); setOpen(false) }}
            style={{ marginTop: 12, width: '100%' }}
          >
            Disconnect
          </button>
        </div>
        </div>
      )}
    </div>
  )
}
