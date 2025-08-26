import { useEffect, useState } from 'react'
import { usePublicClient, useWalletClient, useAccount, useWatchContractEvent } from 'wagmi'
import type { Address } from 'viem'
import { TOKENS } from '../tokens/intuit'
import { fmtAmount, shortAddr } from '../lib/format'
import { encodeFunctionData, parseGwei } from 'viem'
import RouterABI from '../abis/Router02.min.json'
import styles from "../styles/pool.module.css"
import arrow from '../images/arrow.png'

const PairABI = [
  { inputs: [], name: 'token0', outputs: [{ internalType:'address', type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'token1', outputs: [{ internalType:'address', type:'address' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'getReserves', outputs: [
      { internalType:'uint112', name:'reserve0', type:'uint112' },
      { internalType:'uint112', name:'reserve1', type:'uint112' },
      { internalType:'uint32',  name:'blockTimestampLast', type:'uint32' },
    ], stateMutability:'view', type:'function' },
  { anonymous:false, name:'Sync', type:'event', inputs:[
      { indexed:false, internalType:'uint112', name:'reserve0', type:'uint112' },
      { indexed:false, internalType:'uint112', name:'reserve1', type:'uint112' }
    ] }
] as const

const ERC20_MINI = [
  { inputs: [], name: 'symbol', outputs: [{ type:'string' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'decimals', outputs: [{ type:'uint8' }], stateMutability:'view', type:'function' },
  { inputs: [{ internalType:'address', name:'account', type:'address' }], name: 'balanceOf', outputs:[{ type:'uint256' }], stateMutability:'view', type:'function' },
  { inputs: [], name: 'totalSupply', outputs:[{ type:'uint256' }], stateMutability:'view', type:'function' }
] as const


const router = import.meta.env.VITE_ROUTER_ADDRESS as Address
const GAS_PRICE = parseGwei(import.meta.env.VITE_GAS_PRICE_GWEI ?? '0.2')
const GAS_LIMIT_ADD = 1_200_000n
const GAS_LIMIT_REMOVE = 1_000_000n

function addrEq(a?: string, b?: string) { return a?.toLowerCase() === b?.toLowerCase() }

export default function PoolRow({ pair }: { pair: Address }) {
  const pc = usePublicClient()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [t0, setT0] = useState<Address>()
  const [t1, setT1] = useState<Address>()
  const [sym0, setSym0] = useState('…')
  const [sym1, setSym1] = useState('…')
  const [dec0, setDec0] = useState(18)
  const [dec1, setDec1] = useState(18)
  const [r0, setR0] = useState<bigint>(0n)
  const [r1, setR1] = useState<bigint>(0n)
  const [lpBalance, setLpBalance] = useState(0n)
  const [balance0, setBalance0] = useState(0n)
  const [balance1, setBalance1] = useState(0n)

  // Form
  const [amountAdd0, setAmountAdd0] = useState('0')
  const [amountAdd1, setAmountAdd1] = useState('0')
  const [slippage, setSlippage] = useState(0.5)
  const [deadlineMins, setDeadlineMins] = useState(10)
  const [pendingAdd, setPendingAdd] = useState(false)
  const [pendingRemove, setPendingRemove] = useState(false)
  const [percentRemove, setPercentRemove] = useState(25)
  const [liqToRemoveInput, setLiqToRemoveInput] = useState('0')

  // Switch form view: Add or Remove
  const [showAdd, setShowAdd] = useState(true)
  // Pool expand/collapse
  const [expanded, setExpanded] = useState(false)

  // --- Load token info, reserves, wallet balances
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!pc) return
      const [a, b] = await Promise.all([
        pc.readContract({ address: pair, abi: PairABI, functionName: 'token0' }) as Promise<Address>,
        pc.readContract({ address: pair, abi: PairABI, functionName: 'token1' }) as Promise<Address>,
      ])
      if (cancelled) return
      setT0(a)
      setT1(b)

      const [res0, res1] = await pc.readContract({ address: pair, abi: PairABI, functionName: 'getReserves' }) as unknown as [bigint, bigint, number]
      if (cancelled) return
      setR0(res0)
      setR1(res1)

      const m0 = TOKENS.find(x => addrEq(x.address as any, a) || addrEq(x.wrapped as any, a))
      const m1 = TOKENS.find(x => addrEq(x.address as any, b) || addrEq(x.wrapped as any, b))

      try { setSym0(m0?.symbol ?? await pc.readContract({ address: a, abi: ERC20_MINI, functionName: 'symbol' }) as string) } catch { setSym0('TOKEN0') }
      try { setSym1(m1?.symbol ?? await pc.readContract({ address: b, abi: ERC20_MINI, functionName: 'symbol' }) as string) } catch { setSym1('TOKEN1') }
      setDec0((m0?.decimals ?? Number(await pc.readContract({ address: a, abi: ERC20_MINI, functionName: 'decimals' }))) || 18)
      setDec1((m1?.decimals ?? Number(await pc.readContract({ address: b, abi: ERC20_MINI, functionName: 'decimals' }))) || 18)

      if (address) {
        try {
          const [lpBal, bal0, bal1, totalSupply] = await Promise.all([
            pc.readContract({ address: pair, abi: ERC20_MINI, functionName:'balanceOf', args:[address] }) as Promise<bigint>,
            pc.readContract({ address: a, abi: ERC20_MINI, functionName:'balanceOf', args:[address] }) as Promise<bigint>,
            pc.readContract({ address: b, abi: ERC20_MINI, functionName:'balanceOf', args:[address] }) as Promise<bigint>,
            pc.readContract({ address: pair, abi: ERC20_MINI, functionName:'totalSupply' }) as Promise<bigint>,
          ])
      
          if (!cancelled) {
            setLpBalance(lpBal)
            setBalance0(bal0)
            setBalance1(bal1)
      
            // 👇 calcul de la part utilisateur
            const share = totalSupply > 0n ? Number(lpBal) / Number(totalSupply) : 0
            console.log("Share %:", share * 100)
      
            // 👇 calcul des tokens équivalents détenus
            const userToken0 = Number(r0) / 10**dec0 * share
            const userToken1 = Number(r1) / 10**dec1 * share
            console.log(`User has ~ ${userToken0} ${sym0} + ${userToken1} ${sym1} en pool`)
          }
        } catch {}
      }
      
    })()
    return () => { cancelled = true }
  }, [pc, pair, address])

  useWatchContractEvent({
    address: pair,
    abi: PairABI,
    eventName: 'Sync',
    onLogs: (logs) => {
      for (const l of logs) {
        const { reserve0, reserve1 } = l.args as any
        if (typeof reserve0 === 'bigint') setR0(reserve0)
        if (typeof reserve1 === 'bigint') setR1(reserve1)
      }
    }
  })

  const price = r0 > 0n ? (Number(r1)/Number(r0))*(10**(dec0-dec1)) : null
  useEffect(() => {
    if (r0 === 0n || r1 === 0n) return
    const a = BigInt(Math.floor(Number(amountAdd0) * 10**dec0))
    const b = a * r1 / r0
    const value = Number(b) / 10**dec1
    setAmountAdd1(value.toFixed(6))
  }, [amountAdd0, r0, r1, dec0, dec1])
  
  const onAdd = async () => {
    if (!walletClient || !address || !t0 || !t1) return
    setPendingAdd(true)
    try {
      const a = BigInt(Math.floor(Number(amountAdd0) * 10**dec0))
      const b = BigInt(Math.floor(Number(amountAdd1) * 10**dec1))
      const slippageBps = BigInt(Math.floor(slippage*100))
      const minA = a - (a*slippageBps/10_000n)
      const minB = b - (b*slippageBps/10_000n)
      const deadline = BigInt(Math.floor(Date.now()/1000) + deadlineMins*60)
      const data = encodeFunctionData({
        abi: RouterABI as any,
        functionName: 'addLiquidity',
        args: [t0, t1, a, b, minA, minB, address, deadline]
      })
      const hash = await walletClient.sendTransaction({ account: address, to: router, data, gas: GAS_LIMIT_ADD, gasPrice: GAS_PRICE })
      await pc.waitForTransactionReceipt({ hash })
      alert('Liquidity added ✅')
    } catch(e:any) { console.error(e); alert('AddLiquidity failed') }
    finally { setPendingAdd(false) }
  }

  const onRemove = async () => {
    if (!walletClient || !address || !t0 || !t1) return
    setPendingRemove(true)
    try {
      const liq = BigInt(Math.floor(Number(liqToRemoveInput) * 10**18))
      const deadline = BigInt(Math.floor(Date.now()/1000) + deadlineMins*60)
      const data = encodeFunctionData({
        abi: RouterABI as any,
        functionName: 'removeLiquidity',
        args: [t0, t1, liq, 0n, 0n, address, deadline]
      })
      const hash = await walletClient.sendTransaction({ account: address, to: router, data, gas: GAS_LIMIT_REMOVE, gasPrice: GAS_PRICE })
      await pc.waitForTransactionReceipt({ hash })
      alert('Liquidity removed ✅')
    } catch(e:any) { console.error(e); alert('RemoveLiquidity failed') }
    finally { setPendingRemove(false) }
  }
  return (
    <div className={`${styles.listPool} ${expanded ? styles.openPool : ''}`}>
         
      {/* Header cliquable pour expand/collapse */}
      <div className={styles.pool} onClick={() => setExpanded(!expanded)} style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div className={styles.tokenPool}>
          <span className={styles.pair}>{sym0} / {sym1}</span>
          <span className={styles.addressPool}>{shortAddr(pair)}</span>
        </div>

        <div className={styles.reservePool}>
          <span className={styles.labelPool}>Reserve :</span>
          <span className={styles.reserve}>{sym0}: {fmtAmount(r0, dec0)} | {sym1}: {fmtAmount(r1, dec1)}</span>
        </div>

        <div className={styles.rightPool}>
        <div className={styles.pricePool}>
        <span className={styles.labelPool}>Price :</span>
          <div className={styles.reserve}> {price ? `1 ${sym0} ≈ ${price.toFixed(6)} ${sym1}` : '—'}</div>
        </div>
        <div className={styles.reservePool}>
        <span className={styles.labelPool}>LP Balance :</span>
          <div className={styles.reserve}>{fmtAmount(lpBalance, 18)}</div>
       </div>
 
                      <img src={arrow} alt="Logo"  className={expanded ? styles.arrowOpen : styles.arrowClosed}/>
     
      </div>
      </div>

      {/* Contenu Add/Remove affiché seulement si expanded */}
      {expanded && (
        <div>
                <div className={styles.traitGreen}></div>
<div className={styles.choiceContainer}>
  {/* Dynamic sentence based on showAdd */}
  <span className={styles.infoAddRemove}>
    {showAdd 
      ? "You are adding liquidity." 
      : "You are removing liquidity."}
  </span>

  {/* Buttons to toggle the state */}
  <button className={styles.choiceBtn} onClick={() => setShowAdd(true)}>
    <span className={styles.textBtn}>+ Add</span>
  </button>
  <button className={styles.choiceBtn} onClick={() => setShowAdd(false)}>
    <span className={styles.textBtn}>- Remove</span>
  </button>
</div>

{showAdd && (
  <div className={styles.addLiquidity}>
               <button
      onClick={onAdd}
      disabled={!isConnected || pendingAdd}
      className={styles.addBtnBottom}
    >
      {pendingAdd ? 'Adding…' : 'Add'}
    </button>
    <div className={styles.tokenAddRemoveContainer}>
      <div className={styles.tokenOne}>
        <div className={styles.headerToken}>
          <span className={styles.textInfoHeader}>Balance {sym0}:</span>
          <span className={styles.labelToken}>{fmtAmount(balance0, dec0)} {sym0}</span>
        </div>
        <input
          type="number"
          step="any"
          value={amountAdd0}
          onChange={e => setAmountAdd0(e.target.value)}
          className={styles.InputAddRemove}
        />
      </div>
      <div className={styles.tokenTwo}>
        <div className={styles.headerToken}>
          <span className={styles.textInfoHeader}>Balance {sym1}:</span>
          <span className={styles.labelToken}>{fmtAmount(balance1, dec1)} {sym1}</span>
        </div>
        <input
          type="number"
          step="any"
          value={amountAdd1}
          onChange={e => setAmountAdd1(e.target.value)}
          className={styles.InputAddRemove}
        />
      </div>
    </div>

    {/* Slippage & Deadline styled comme Swap.tsx */}
    <div className={styles.infosContainer} style={{ marginTop: 8 }}>
      <div className={styles.ligneInfoLabel}>
        <span className={styles.nameLigne}>Slippage:</span>
        <div className={styles.choicePercent}>
          {[0.1, 0.5, 1].map(p => (
            <button
              key={p}
              className={`${styles.choice} ${slippage === p ? styles.activeChoice : ''}`}
              onClick={() => setSlippage(p)}
            >
              {p}%
            </button>
          ))}
          <div className={styles.inputPercentWrapper}>
            <input
              type="number"
              step="0.1"
              min="0"
              value={slippage}
              onChange={e => setSlippage(Number(e.target.value))}
              className={styles.inputCustom}
            />
            <span className={styles.Sign}>%</span>
          </div>
        </div>
      </div>

      <div className={styles.ligneInfoLabel}>
        <span className={styles.nameLigne}>Deadline:</span>
        <div className={styles.inputPercentWrapper}>
          <input
            type="number"
            min={1}
            value={deadlineMins}
            onChange={e => setDeadlineMins(Number(e.target.value))}
            className={styles.inputCustom}
          />
          <span className={styles.percentSign}>min</span>
        </div>
        
      </div>
    </div>


  </div>
)}


          {!showAdd && (
            <div className={styles.removeLiquidity}>
  

  <div className={styles.tokenRemove}>
        <div className={styles.headerTokenRemove}>
       
          <span className={styles.textInfoHeader}>Balance LP tokens:</span>
          <span className={styles.labelToken}>{fmtAmount(lpBalance, 18)}</span>
        </div>
        <input
  className={styles.InputAddRemove}
  type="number"
  step="any"
  value={liqToRemoveInput}
  onChange={e => setLiqToRemoveInput(e.target.value)}
/>

      </div>
        
              <div className={styles.choicePercentRemoveContainer}>
  {[25, 50, 75, 100].map(p => {
    const isActive = percentRemove === p; // active si ce bouton correspond au pourcentage sélectionné
    return (
      <button
        key={p}
        onClick={() => {
          const liq = lpBalance * BigInt(p) / 100n;
          setLiqToRemoveInput((Number(liq) / 10**18).toFixed(6));

          setPercentRemove(p);
        }}
        className={`${styles.choiceRemoveBtn} ${isActive ? styles.activeChoiceRemoveBtn : ''}`}
      >
        {p}%
      </button>
    )
  })}
</div>

              <button className={styles.removeBtnBottom} onClick={onRemove} disabled={!isConnected || pendingRemove}>
                {pendingRemove ? 'Removing…' : 'Remove'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
