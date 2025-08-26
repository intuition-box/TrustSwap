import React, { useMemo } from "react"
import type { Address, Abi } from "viem"
import { useAccount } from "wagmi"
import { useNetworkFees, useTxGasEstimate, computeTxCostText } from "../hooks/useSwapGas"

const NATIVE_SYM = import.meta.env.VITE_NATIVE_SYMBOL || "tTRUST"
const NATIVE_DECIMALS = Number(import.meta.env.VITE_NATIVE_DECIMALS || 18)

export default function SwapGasFees({
  to, abi, functionName, args, value, enabled = true, fallbackGas = 200_000n,   // ⬅️ ajoute value ici
}: {
  to: Address
  abi: Abi
  functionName: string
  args: any[]
  value?: bigint
  enabled?: boolean
  fallbackGas?: bigint
}) {
  const { address } = useAccount()
  const fees = useNetworkFees()
  const est = useTxGasEstimate({
    to, abi, functionName, args,
    account: address as Address | undefined,
    enabled, fallbackGas,
    value,                                  
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
    <div className="text-xs p-2 border rounded-lg flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div>
          <span className="opacity-70">Network gas:</span>{" "}
          <b>{gwei} gwei</b>
          {fees.baseFeePerGas && fees.maxPriorityFeePerGas && (
            <span className="opacity-70">
              {" "}· base {Math.floor(Number(fees.baseFeePerGas)/1e9)} + tip {(Number(fees.maxPriorityFeePerGas)/1e9).toFixed(2)}
            </span>
          )}
        </div>
        <div className="opacity-70">
          {est.loading ? "Estimating tx gas…" :
            est.gasLimit ? <>Est. gas: <b>{est.gasLimit.toString()}</b></> : "Est. gas: —"}
        </div>
        {est.error && <div className="text-amber-600">Using fallback gas (estimation failed)</div>}
      </div>

      <div className="text-right">
        <div className="opacity-70">Est. tx cost</div>
        <div><b>{cost.text} {NATIVE_SYM}</b></div>
        <div className="mt-1 flex gap-2 justify-end">
          <button className="border rounded px-2 py-0.5" onClick={() => { fees.refresh(); est.refresh() }}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
