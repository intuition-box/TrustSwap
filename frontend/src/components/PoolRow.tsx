// src/components/PoolRow.tsx
import { useEffect, useMemo, useState } from "react"
import {
  usePublicClient,
  useWalletClient,
  useAccount,
  useWatchContractEvent,
} from "wagmi"
import type { Address } from "viem"
import {
  encodeFunctionData,
  parseGwei,
  parseUnits,
  formatUnits,
  maxUint256,
} from "viem"

import { TOKENS } from "../tokens/intuit"
import { fmtAmount, shortAddr } from "../lib/format"
import RouterABI from "../abis/Router02.min.json"

import styles from "../styles/pool.module.css"
import arrow from "../images/arrow.png"

const PairABI = [
  { inputs: [], name: "token0", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "token1", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  { anonymous: false, name: "Sync", type: "event", inputs: [
    { indexed: false, name: "reserve0", type: "uint112" },
    { indexed: false, name: "reserve1", type: "uint112" },
  ]},
] as const

const ERC20_MINI = [
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  // needed for approvals
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const

const router = import.meta.env.VITE_ROUTER_ADDRESS as Address
const GAS_PRICE = parseGwei(import.meta.env.VITE_GAS_PRICE_GWEI ?? "0.2")
const GAS_LIMIT_ADD = 1_200_000n
const GAS_LIMIT_REMOVE = 1_000_000n

function addrEq(a?: string, b?: string) {
  return a?.toLowerCase() === b?.toLowerCase()
}

function limitDecimals(s: string, max = 6) {
  if (!s) return s
  const x = s.replace(/,/g, ".").replace(/[^\d.]/g, "")         // keep digits + dot
  const parts = x.split(".")
  if (parts.length <= 1) return parts[0]                         // no decimals
  return parts[0] + "." + parts[1].slice(0, max)                 // clamp to max
}

export default function PoolRow({ pair }: { pair: Address }) {
  const pc = usePublicClient()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [t0, setT0] = useState<Address>()
  const [t1, setT1] = useState<Address>()
  const [sym0, setSym0] = useState("…")
  const [sym1, setSym1] = useState("…")
  const [dec0, setDec0] = useState(18)
  const [dec1, setDec1] = useState(18)

  const [r0, setR0] = useState<bigint>(0n)
  const [r1, setR1] = useState<bigint>(0n)

  const [lpDecimals, setLpDecimals] = useState(18)
  const [lpTotalSupply, setLpTotalSupply] = useState<bigint>(0n)
  const [lpBalance, setLpBalance] = useState<bigint>(0n)
  const [lpAllowance, setLpAllowance] = useState<bigint>(0n)

  const [balance0, setBalance0] = useState<bigint>(0n)
  const [balance1, setBalance1] = useState<bigint>(0n)

  // Form state
  const [amountAdd0, setAmountAdd0] = useState("0")
  const [amountAdd1, setAmountAdd1] = useState("0")
  const [slippage, setSlippage] = useState(0.5) // percent
  const [deadlineMins, setDeadlineMins] = useState(10)
  const [pendingAdd, setPendingAdd] = useState(false)
  const [pendingRemove, setPendingRemove] = useState(false)
  const [percentRemove, setPercentRemove] = useState(25)
  const [liqToRemoveInput, setLiqToRemoveInput] = useState("0")

  // UX
  const [showAdd, setShowAdd] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // ---- Load metadata + reserves + balances
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!pc) return
      const [a, b] = await Promise.all([
        pc.readContract({ address: pair, abi: PairABI, functionName: "token0" }) as Promise<Address>,
        pc.readContract({ address: pair, abi: PairABI, functionName: "token1" }) as Promise<Address>,
      ])
      if (cancelled) return
      setT0(a); setT1(b)

      const reserves = await pc.readContract({
        address: pair, abi: PairABI, functionName: "getReserves",
      }) as unknown as [bigint, bigint, number]
      if (cancelled) return
      setR0(reserves[0]); setR1(reserves[1])

      // Try known tokens list first (faster), fallback on-chain
      const m0 = TOKENS.find(x => addrEq(x.address as any, a) || addrEq(x.wrapped as any, a))
      const m1 = TOKENS.find(x => addrEq(x.address as any, b) || addrEq(x.wrapped as any, b))

      try { setSym0(m0?.symbol ?? await pc.readContract({ address: a, abi: ERC20_MINI, functionName: "symbol" }) as string) } catch { setSym0("TOKEN0") }
      try { setSym1(m1?.symbol ?? await pc.readContract({ address: b, abi: ERC20_MINI, functionName: "symbol" }) as string) } catch { setSym1("TOKEN1") }

      try {
        const [d0, d1] = await Promise.all([
          (m0?.decimals ?? (await pc.readContract({ address: a, abi: ERC20_MINI, functionName: "decimals" }))) as number,
          (m1?.decimals ?? (await pc.readContract({ address: b, abi: ERC20_MINI, functionName: "decimals" }))) as number,
        ])
        if (!cancelled) { setDec0(Number(d0) || 18); setDec1(Number(d1) || 18) }
      } catch {}

      // LP decimals + totalSupply
      try {
        const [lpDecRaw, ts] = await Promise.all([
          pc.readContract({ address: pair, abi: ERC20_MINI, functionName: "decimals" }) as Promise<number>,
          pc.readContract({ address: pair, abi: ERC20_MINI, functionName: "totalSupply" }) as Promise<bigint>,
        ])
        if (!cancelled) { setLpDecimals(Number(lpDecRaw) || 18); setLpTotalSupply(ts) }
      } catch {}

      // Balances + allowance (if connected)
      if (address) {
        try {
          const [lpBal, bal0, bal1, allowance] = await Promise.all([
            pc.readContract({ address: pair, abi: ERC20_MINI, functionName:"balanceOf", args:[address] }) as Promise<bigint>,
            pc.readContract({ address: a, abi: ERC20_MINI, functionName:"balanceOf", args:[address] }) as Promise<bigint>,
            pc.readContract({ address: b, abi: ERC20_MINI, functionName:"balanceOf", args:[address] }) as Promise<bigint>,
            pc.readContract({ address: pair, abi: ERC20_MINI, functionName:"allowance", args:[address, router] }) as Promise<bigint>,
          ])
          if (!cancelled) {
            setLpBalance(lpBal)
            setBalance0(bal0)
            setBalance1(bal1)
            setLpAllowance(allowance)
          }
        } catch {}
      }
    })()
    return () => { cancelled = true }
  }, [pc, pair, address])

  // Live reserves updates
  useWatchContractEvent({
    address: pair,
    abi: PairABI,
    eventName: "Sync",
    onLogs: (logs) => {
      for (const l of logs) {
        const { reserve0, reserve1 } = l.args as any
        if (typeof reserve0 === "bigint") setR0(reserve0)
        if (typeof reserve1 === "bigint") setR1(reserve1)
      }
    },
  })

  // Price display (safe conversion via formatUnits to avoid BigInt overflow)
  const price = useMemo(() => {
    if (r0 === 0n || r1 === 0n) return null
    const n0 = parseFloat(formatUnits(r0, dec0))
    const n1 = parseFloat(formatUnits(r1, dec1))
    if (!isFinite(n0) || !isFinite(n1) || n0 === 0) return null
    return n1 / n0
  }, [r0, r1, dec0, dec1])

  // Auto-fill amountAdd1 when amountAdd0 changes, honoring reserves ratio
  useEffect(() => {
    if (r0 === 0n || r1 === 0n) return
    try {
      const a = parseUnits(amountAdd0 || "0", dec0)
      const b = a === 0n ? 0n : (a * r1) / r0
      setAmountAdd1(formatUnits(b, dec1))
    } catch {
      // ignore parse errors
    }
  }, [amountAdd0, r0, r1, dec0, dec1])

  async function ensureApproval(token: Address, required: bigint) {
    if (!walletClient || !address) return
    const curr = await pc.readContract({
      address: token, abi: ERC20_MINI, functionName: "allowance", args: [address, router],
    }) as bigint
    if (curr >= required) return
    const data = encodeFunctionData({
      abi: ERC20_MINI as any,
      functionName: "approve",
      args: [router, maxUint256],
    })
    const hash = await walletClient.sendTransaction({
      account: address, to: token, data, gasPrice: GAS_PRICE,
    })
    await pc.waitForTransactionReceipt({ hash })
  }

  async function ensureLpApproval(required: bigint) {
    if (!walletClient || !address) return
    const curr = await pc.readContract({
      address: pair, abi: ERC20_MINI, functionName: "allowance", args: [address, router],
    }) as bigint
    if (curr >= required) return
    const data = encodeFunctionData({
      abi: ERC20_MINI as any,
      functionName: "approve",
      args: [router, maxUint256],
    })
    const hash = await walletClient.sendTransaction({
      account: address, to: pair, data, gasPrice: GAS_PRICE,
    })
    await pc.waitForTransactionReceipt({ hash })
    setLpAllowance(maxUint256)
  }

  const onAdd = async () => {
    if (!walletClient || !address || !t0 || !t1) return
    setPendingAdd(true)
    try {
      const a = parseUnits(amountAdd0 || "0", dec0)
      const b = parseUnits(amountAdd1 || "0", dec1)
      // approvals for token0 & token1
      await ensureApproval(t0, a)
      await ensureApproval(t1, b)

      const slippageBps = BigInt(Math.floor(slippage * 100)) // e.g., 0.5% => 50 bps
      const minA = a - (a * slippageBps / 10_000n)
      const minB = b - (b * slippageBps / 10_000n)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMins * 60)

      const data = encodeFunctionData({
        abi: RouterABI as any,
        functionName: "addLiquidity",
        args: [t0, t1, a, b, minA, minB, address, deadline],
      })
      const hash = await walletClient.sendTransaction({
        account: address, to: router, data, gas: GAS_LIMIT_ADD, gasPrice: GAS_PRICE,
      })
      await pc.waitForTransactionReceipt({ hash })
      alert("Liquidity added ✅")
    } catch (e: any) {
      console.error(e)
      alert("AddLiquidity failed")
    } finally {
      setPendingAdd(false)
    }
  }

  const onRemove = async () => {
    if (!walletClient || !address || !t0 || !t1) return
    setPendingRemove(true)
    try {
      const liq = parseUnits(liqToRemoveInput || "0", lpDecimals)
      // LP approval if needed
      await ensureLpApproval(liq)

      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMins * 60)
      const data = encodeFunctionData({
        abi: RouterABI as any,
        functionName: "removeLiquidity",
        args: [t0, t1, liq, 0n, 0n, address, deadline], // min amounts = 0 (you can add slippage handling later)
      })
      const hash = await walletClient.sendTransaction({
        account: address, to: router, data, gas: GAS_LIMIT_REMOVE, gasPrice: GAS_PRICE,
      })
      await pc.waitForTransactionReceipt({ hash })
      alert("Liquidity removed ✅")
    } catch (e: any) {
      console.error(e)
      alert("RemoveLiquidity failed")
    } finally {
      setPendingRemove(false)
    }
  }

  // Remove preview
  const removePreview = useMemo(() => {
    try {
      if (lpTotalSupply === 0n) return null
      const liq = parseUnits(liqToRemoveInput || "0", lpDecimals)
      const exp0 = (liq * r0) / lpTotalSupply
      const exp1 = (liq * r1) / lpTotalSupply
      return { exp0, exp1 }
    } catch {
      return null
    }
  }, [liqToRemoveInput, lpDecimals, lpTotalSupply, r0, r1])

  function formatPoolPct(lpBal: bigint, total: bigint, decimals = 2) {
    if (total === 0n) return "0%"
    const scale = 10n ** BigInt(decimals)              // 10^decimals
    const scaled = (lpBal * 100n * scale) / total      // percent * 10^decimals
    const intPart = scaled / scale
    const fracPart = scaled % scale
    const fracStr = fracPart.toString().padStart(decimals, "0")
    return `${intPart.toString()}.${fracStr}%`
  }

  const sharePct = useMemo(
    () => formatPoolPct(lpBalance, lpTotalSupply, 2),   
    [lpBalance, lpTotalSupply]
  )

  return (
    <div className={`${styles.listPool} ${expanded ? styles.openPool : ""}`}>
      {/* Header */}
      <div
        className={styles.pool}
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div className={styles.tokenPool}>
          <span className={styles.pair}>{sym0} / {sym1}</span>
          <span className={styles.addressPool}>{shortAddr(pair)}</span>
        </div>

        <div className={styles.reservePool}>
          <span className={styles.labelPool}>Reserve :</span>
          <span className={styles.reserve}>
            {sym0}: {fmtAmount(r0, dec0)} | {sym1}: {fmtAmount(r1, dec1)}
          </span>
        </div>

        <div className={styles.rightPool}>
          <div className={styles.pricePool}>
            <span className={styles.labelPool}>Price :</span>
            <div className={styles.reserve}>
              {price ? `1 ${sym0} ≈ ${price.toFixed(6)} ${sym1}` : "—"}
            </div>
          </div>
            <div className={styles.reservePool}>
              <span className={styles.labelPool}>LP Balance :</span>
              <div className={styles.reserve}>
                {fmtAmount(lpBalance, lpDecimals)} <span className={styles.sharePct}> / {sharePct}</span>
              </div>
            </div>
          <img src={arrow} alt="toggle" className={expanded ? styles.arrowOpen : styles.arrowClosed} />
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div>
          <div className={styles.traitGreen}></div>

          <div className={styles.choiceContainer}>
            <span className={styles.infoAddRemove}>
              {showAdd ? "You are adding liquidity." : "You are removing liquidity."}
            </span>

            <button className={styles.choiceBtn} onClick={() => setShowAdd(true)}>
              <span className={styles.textBtn}>+ Add</span>
            </button>
            <button className={styles.choiceBtn} onClick={() => setShowAdd(false)}>
              <span className={styles.textBtn}>- Remove</span>
            </button>
          </div>

          {/* ADD */}
          {showAdd && (
            <div className={styles.addLiquidity}>
              <button
                onClick={onAdd}
                disabled={!isConnected || pendingAdd}
                className={styles.addBtnBottom}
              >
                {pendingAdd ? "Adding…" : "Add"}
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

              {/* Slippage / Deadline */}
              <div className={styles.infosContainer} style={{ marginTop: 8 }}>
                <div className={styles.ligneInfoLabel}>
                  <span className={styles.nameLigne}>Slippage:</span>
                  <div className={styles.choicePercent}>
                    {[0.1, 0.5, 1].map(p => (
                      <button
                        key={p}
                        className={`${styles.choice} ${slippage === p ? styles.activeChoice : ""}`}
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

          {/* REMOVE */}
          {!showAdd && (
            <div className={styles.removeLiquidity}>
              <div className={styles.tokenRemove}>
                <div className={styles.headerTokenRemove}>
                  <span className={styles.textInfoHeader}>Balance LP tokens:</span>
                  <span className={styles.labelToken}>{fmtAmount(lpBalance, lpDecimals)}</span>
                </div>
                <input
                  className={styles.InputAddRemove}
                  type="number"
                  step="any"
                  value={liqToRemoveInput}
                  onChange={e => setLiqToRemoveInput(e.target.value)}
                />
                {/* Preview what the user will receive */}
                {removePreview && (
                  <div className={styles.previewOut} style={{ marginTop: 6 }}>
                    <span className={styles.textInfoHeader}>
                      You’ll receive ≈ {fmtAmount(removePreview.exp0, dec0)} {sym0} + {fmtAmount(removePreview.exp1, dec1)} {sym1}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.choicePercentRemoveContainer}>
                {[25, 50, 75, 100].map(p => {
                  const active = percentRemove === p
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        const liq = lpBalance * BigInt(p) / 100n
                        setLiqToRemoveInput(limitDecimals(formatUnits(liq, lpDecimals), 6))
                        setPercentRemove(p)
                      }}
                      className={`${styles.choiceRemoveBtn} ${active ? styles.activeChoiceRemoveBtn : ""}`}
                    >
                      {p}%
                    </button>
                  )
                })}
              </div>

              <button
                className={styles.removeBtnBottom}
                onClick={onRemove}
                disabled={!isConnected || pendingRemove}
              >
                {pendingRemove ? "Removing…" : "Remove"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
