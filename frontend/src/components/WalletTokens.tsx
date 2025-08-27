import { usePublicClient } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { erc20Abi, formatUnits } from 'viem'
import { TOKENS } from '../tokens/intuit'
import styles from "../styles/connect.module.css"
import refresh from '../images/rafraichir.png'
import Color from "../components/Color"; 


type UiToken = {
  symbol: string
  decimals: number
  isNative?: boolean
  address?: Address
  wrapped?: Address
}


export default function WalletTokens({ address }: { address: Address }) {
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
      <div className={styles.walletHeader}>
        <p className={styles.labelWallet}>Preferences</p>
          <p>Style:</p>
            <Color />

      </div>
    </div>
  )
}