// src/hooks/useSwapGas.ts
import { useCallback, useEffect, useMemo, useState } from "react"
import { Address, Abi, formatUnits } from "viem"
import { usePublicClient } from "wagmi"

// ---------- utils ----------
function limitDecimalsStr(x: string, max = 6) {
  const [i, f = ""] = x.split(".")
  return f ? `${i}.${f.slice(0, max)}` : i
}

// stringify-safe: remplace BigInt -> string
function argsKeyFrom(value: any): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
}

// ---------- fees (read network) ----------
export function useNetworkFees() {
  const pc = usePublicClient()
  const [state, setState] = useState<{
    gasPriceWei?: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    baseFeePerGas?: bigint
    loading: boolean
    error?: string
    ts?: number
  }>({ loading: true })

  const refresh = useCallback(async () => {
    if (!pc) return
    setState(s => ({ ...s, loading: true, error: undefined }))
    try {
      // EIP-1559 (viem v2)
      // @ts-ignore
      const eip = await (pc as any).estimateFeesPerGas?.()
      if (eip && (eip.maxFeePerGas || eip.baseFeePerGas || eip.gasPrice)) {
        setState({
          gasPriceWei: eip.gasPrice,
          maxFeePerGas: eip.maxFeePerGas,
          maxPriorityFeePerGas: eip.maxPriorityFeePerGas,
          baseFeePerGas: eip.baseFeePerGas,
          loading: false,
          ts: Date.now(),
        })
        return
      }
      // Legacy
      const gp = await pc.getGasPrice()
      setState({ gasPriceWei: gp, loading: false, ts: Date.now() })
    } catch (e: any) {
      setState({ loading: false, error: e?.shortMessage || e?.message || "fee read failed" })
    }
  }, [pc])

  useEffect(() => { refresh() }, [refresh])

  return { ...state, refresh }
}

// ---------- estimate specific tx ----------
export function useTxGasEstimate<TAbi extends Abi, TName extends string>({
  to,
  abi,
  functionName,
  args,
  account,
  value,                 // <— supporte la valeur (ETH/tTRUST) pour les swaps natifs
  enabled = true,
  fallbackGas = 200_000n,
}: {
  to: Address
  abi: TAbi
  functionName: TName
  args: any[]
  account?: Address
  value?: bigint
  enabled?: boolean
  fallbackGas?: bigint
}) {
  const pc = usePublicClient()
  const [gasLimit, setGasLimit] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // clé stable qui ne casse pas avec BigInt
  const argsKey = useMemo(() => argsKeyFrom(args), [args])
  const valueKey = useMemo(() => (value === undefined ? "nv" : value.toString()), [value])

  const refresh = useCallback(async () => {
    if (!pc || !enabled || !account) { setGasLimit(null); return }
    setLoading(true); setError(null)
    try {
      const { encodeFunctionData } = await import("viem")
      const data = encodeFunctionData({ abi: abi as any, functionName: functionName as any, args })
      const est = await pc.estimateGas({ account, to, data, value }) // value inclus (si natif)
      setGasLimit(est)
    } catch (e: any) {
      setGasLimit(fallbackGas)
      setError(e?.shortMessage || e?.message || null)
    } finally {
      setLoading(false)
    }
  }, [pc, enabled, account, to, functionName, argsKey, valueKey, fallbackGas])

  useEffect(() => { refresh() }, [refresh])

  return { gasLimit, loading, error, refresh }
}

// ---------- compute cost text ----------
export function computeTxCostText({
  gasLimit,
  gasPriceWei,
  maxFeePerGas,
  baseFeePerGas,
  maxPriorityFeePerGas,
  nativeDecimals = 18,
}: {
  gasLimit?: bigint | null
  gasPriceWei?: bigint
  maxFeePerGas?: bigint
  baseFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nativeDecimals?: number
}) {
  if (!gasLimit || gasLimit === 0n) return { text: "—", wei: 0n }
  const price =
    (baseFeePerGas && maxPriorityFeePerGas && (baseFeePerGas + maxPriorityFeePerGas)) ||
    maxFeePerGas ||
    gasPriceWei
  if (!price) return { text: "—", wei: 0n }
  const wei = gasLimit * price
  const native = formatUnits(wei, nativeDecimals)
  return { text: limitDecimalsStr(native, 6), wei }
}
