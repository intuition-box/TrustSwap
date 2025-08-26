// src/hooks/useSwapGas.ts
import { useCallback, useEffect, useMemo, useState } from "react"
import { Address, Abi, formatUnits } from "viem"
import { usePublicClient } from "wagmi"

function limitDecimalsStr(x: string, max = 6) {
  const [i, f = ""] = x.split(".")
  return f ? `${i}.${f.slice(0, max)}` : i
}

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
      // Try EIP-1559 first
      // @ts-ignore (present in viem v2)
      const eip = await (pc as any).estimateFeesPerGas?.()
      if (eip && (eip.maxFeePerGas || eip.baseFeePerGas || eip.gasPrice)) {
        setState({
          gasPriceWei: eip.gasPrice, // may be undefined on 1559 chains
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

export function useTxGasEstimate<TAbi extends Abi, TName extends string>({
  to,
  abi,
  functionName,
  args,
  account,
  value,                // ⬅️ NEW
  enabled = true,
  fallbackGas = 200_000n,
}: {
  to: Address
  abi: TAbi
  functionName: TName
  args: any[]
  account?: Address
  value?: bigint        // ⬅️ NEW
  enabled?: boolean
  fallbackGas?: bigint
}) {
  const pc = usePublicClient()
  const [gasLimit, setGasLimit] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!pc || !enabled || !account) { setGasLimit(null); return }
    setLoading(true); setError(null)
    try {
      const { encodeFunctionData } = await import("viem")
      const data = encodeFunctionData({ abi: abi as any, functionName: functionName as any, args })
      const est = await pc.estimateGas({ account, to, data, value })  // ⬅️ passe value ici
      setGasLimit(est)
    } catch (e: any) {
      setGasLimit(fallbackGas)
      setError(e?.shortMessage || e?.message || null)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pc, enabled, account, to, JSON.stringify(args), functionName, value, fallbackGas]) // ⬅️ value en dépendance

  useEffect(() => { refresh() }, [refresh])

  return { gasLimit, loading, error, refresh }
}

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
  // Choose a price: prefer EIP-1559 (base + tip), else maxFee, else legacy gasPrice
  const price =
    (baseFeePerGas && maxPriorityFeePerGas && (baseFeePerGas + maxPriorityFeePerGas)) ||
    maxFeePerGas ||
    gasPriceWei
  if (!price) return { text: "—", wei: 0n }
  const wei = gasLimit * price
  const native = formatUnits(wei, nativeDecimals)
  return { text: limitDecimalsStr(native, 6), wei }
}
