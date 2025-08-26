// src/components/Connect.tsx
import { useAccount, useConnect, useDisconnect, usePublicClient } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { erc20Abi, formatUnits } from 'viem'
import { TOKENS } from '../tokens/intuit'
import AdminOnlySetter from "../components/admin/AdminOnlySetter"
import ProtocolFeeCard from "../components/admin/ProtocolFeeCard"

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
  const display = useMemo(
    () => rows.filter(r => !hideZero || r.balance > 0n),
    [rows, hideZero]
  )

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, address])

  return (
    <div style={{marginTop: 8}}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <strong>Mes tokens</strong>
        <label style={{fontSize:12, display:'flex', alignItems:'center', gap:6}}>
          <input type="checkbox" checked={hideZero} onChange={e=>setHideZero(e.target.checked)} />
          Masquer soldes à 0
        </label>
        <button onClick={load} style={{marginLeft:'auto', fontSize:12}}>Actualiser</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:6}}>
        {display.length === 0 && <div style={{gridColumn:'1 / -1', opacity:0.7}}>Aucun token à afficher.</div>}
        {display.map(({symbol, balance, decimals}) => (
          <div key={symbol} style={{display:'flex', justifyContent:'space-between', padding:'6px 10px', border:'1px solid #eee', borderRadius:8}}>
            <span>{symbol}</span>
            <span>{Number(formatUnits(balance, decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
          </div>
        ))}
      </div>
      {/*       
        <AdminOnlySetter>
          <div className="p-3 border rounded-2xl space-y-3">
            <h3 className="font-medium">Admin</h3>
            <ProtocolFeeCard />
          </div>
        </AdminOnlySetter>
       */}
    </div>
  )
}

export default function Connect() {
  const { isConnected, address } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {address}</p>
          {address && <WalletTokens address={address} />}

          <button onClick={() => disconnect()} style={{marginTop:12}}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => connect({ connector: injected() })} disabled={isPending}>
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
