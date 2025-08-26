// src/hooks/useIsFeeToSetter.ts
import { useEffect, useMemo, useState } from "react"
import { useAccount, usePublicClient } from "wagmi"

const abi = [
  { type: "function", name: "feeToSetter", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const

const ZERO = "0x0000000000000000000000000000000000000000"
const norm = (a?: string) => (a || "").toLowerCase()

export function useIsFeeToSetter(factory?: `0x${string}`) {
  const FACTORY = (factory || import.meta.env.VITE_FACTORY_ADDRESS) as `0x${string}`
  const pub = usePublicClient()
  const { address } = useAccount()

  const [setter, setSetter] = useState<string>(ZERO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pub || !FACTORY) return
    setLoading(true); setError(null)
    pub.readContract({ address: FACTORY, abi, functionName: "feeToSetter" })
      .then((s) => setSetter(String(s)))
      .catch((e: any) => setError(e?.message || "read failed"))
      .finally(() => setLoading(false))
  }, [pub, FACTORY])

  const isSetter = useMemo(() => norm(address) === norm(setter), [address, setter])
  return { isSetter, setter, address, loading, error }
}
