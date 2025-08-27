import React, { useMemo } from "react"
import type { Address, Abi } from "viem"
import { useAccount } from "wagmi"
import { useNetworkFees, useTxGasEstimate, computeTxCostText } from "../hooks/useSwapGas"
import { NATIVE_SYMBOL, /* NATIVE_DECIMALS if needed */ } from '../config/protocol'
const NATIVE_SYM = NATIVE_SYMBOL || "tTRUST"
const NATIVE_DECIMALS = 18

export default function SwapGasFees({
  to, abi, functionName, args, value, enabled = true, fallbackGas = 200_000n, className,
}: {
  to: Address
  abi: Abi
  functionName: string
  args: any[]
  value?: bigint
  enabled?: boolean
  fallbackGas?: bigint
  className?: string
}) {
  const { address } = useAccount()
  const fees = useNetworkFees()
  const est = useTxGasEstimate({
    to, abi, functionName, args, value,
    account: address as Address | undefined,
    enabled, fallbackGas,
  })

  const cost = useMemo(() => computeTxCostText({
    gasLimit: est.gasLimit ?? undefined,
    gasPriceWei: fees.gasPriceWei,
    maxFeePerGas: fees.maxFeePerGas,
    baseFeePerGas: fees.baseFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    nativeDecimals: NATIVE_DECIMALS,
  }), [est.gasLimit, fees.gasPriceWei, fees.maxFeePerGas, fees.baseFeePerGas, fees.maxPriorityFeePerGas])

  const gwei =
    fees.gasPriceWei
      ? (Number(fees.gasPriceWei) / 1e9).toFixed(2)
      : fees.maxFeePerGas
        ? (Number(fees.maxFeePerGas) / 1e9).toFixed(2)
        : "—"

  return (
    <div className={className ?? "text-xs p-2 border rounded-lg space-y-1"}>
      <div className="flex items-center justify-between">
        <span className="opacity-70">Network gas:</span>
        <b>{gwei} gwei</b>
      </div>
      <div className="flex items-center justify-between">
        <span className="opacity-70">Est. tx cost</span>
        <b>{cost.text} {NATIVE_SYM}</b>
      </div>
    </div>
  )
}
