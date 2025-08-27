import React, { useCallback, useEffect, useMemo, useState } from "react"
import { usePublicClient, useWalletClient, useAccount } from "wagmi"
import { FACTORY_ADDRESS, PROTOCOL_TREASURY } from "../../config/protocol"
const factoryAbi = [
  { type: "function", name: "feeTo",        stateMutability: "view",       inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "feeToSetter",  stateMutability: "view",       inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "setFeeTo",     stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] }
] as const

const ZERO = "0x0000000000000000000000000000000000000000"

export default function ProtocolFeeCard({
  factory = FACTORY_ADDRESS as `0x${string}`,
  treasury = PROTOCOL_TREASURY as `0x${string}`
}) {
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()
  const { address } = useAccount()

  const [feeTo, setFeeTo] = useState<string>(ZERO)
  const [setter, setSetter] = useState<string>(ZERO)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const on = feeTo !== ZERO
  const youAreSetter = useMemo(
    () => !!address && setter.toLowerCase() === address.toLowerCase(),
    [address, setter]
  )

  const refresh = useCallback(async () => {
    if (!pub || !factory) return
    const [a, b] = await Promise.all([
      pub.readContract({ address: factory, abi: factoryAbi, functionName: "feeTo" }) as Promise<string>,
      pub.readContract({ address: factory, abi: factoryAbi, functionName: "feeToSetter" }) as Promise<string>
    ])
    setFeeTo(a); setSetter(b)
  }, [pub, factory])

  useEffect(() => { refresh() }, [refresh])

  const enable = async () => {
    if (!wallet) return
    setErr(null); setLoading(true)
    try {
      await wallet.writeContract({ address: factory, abi: factoryAbi, functionName: "setFeeTo", args: [treasury] })
      await refresh()
    } catch (e: any) { setErr(e?.shortMessage || e?.message || "Tx failed") }
    finally { setLoading(false) }
  }

  const disable = async () => {
    if (!wallet) return
    setErr(null); setLoading(true)
    try {
      await wallet.writeContract({ address: factory, abi: factoryAbi, functionName: "setFeeTo", args: [ZERO] })
      await refresh()
    } catch (e: any) { setErr(e?.shortMessage || e?.message || "Tx failed") }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 border rounded-2xl space-y-2">
      <div className="text-sm opacity-70">Factory</div>
      <div className="font-mono text-xs break-all">{factory}</div>

      <div className="text-sm mt-2">feeToSetter: <span className="font-mono">{setter}</span></div>
      <div className="text-sm">feeTo (treasury): <span className="font-mono">{feeTo}</span></div>

      <div className="mt-3 flex gap-2">
        <button
          className="border rounded px-3 py-1"
          onClick={enable}
          disabled={loading || on || !youAreSetter}
          title={!youAreSetter ? "Connect as feeToSetter to enable" : ""}
        >
          Enable → {treasury?.slice(0, 6)}…{treasury?.slice(-4)}
        </button>
        <button
          className="border rounded px-3 py-1"
          onClick={disable}
          disabled={loading || !on || !youAreSetter}
          title={!youAreSetter ? "Connect as feeToSetter to disable" : ""}
        >
          Disable
        </button>
      </div>

      <div className="text-sm">
        Status:{" "}
        <b className={on ? "text-green-600" : "text-gray-600"}>
          {on ? "ON (≈0.05% protocol, ≈0.25% LPs)" : "OFF (0.30% to LPs)"}
        </b>
      </div>

      {!youAreSetter && (
        <div className="text-xs opacity-70">
          Connect the wallet that equals <span className="font-mono">{setter}</span> to toggle.
        </div>
      )}

      {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
    </div>
  )
}
