import { useEffect, useMemo, useState } from "react"
import { isAddress, type Address } from "viem"
import { usePublicClient } from "wagmi"
import { fetchErc20Meta } from "../lib/erc20"
import { getCustomTokens, addCustomToken, type UiToken } from "../lib/customTokens"
import { TOKENS } from "../tokens/intuit" // your curated default list

const WNATIVE = (import.meta.env.VITE_WNATIVE_ADDRESS || "").toLowerCase()
const NATIVE_SYM = import.meta.env.VITE_NATIVE_SYMBOL || "tTRUST"
const WRAPPED_SYM = import.meta.env.VITE_WRAPPED_SYMBOL || "WTTRUST"
const SHOW_WRAPPED = (import.meta.env.VITE_SHOW_WRAPPED_SYMBOL || "false") === "true"

function labelFor(addr?: string, onchain?: string) {
  if (!addr) return onchain || "TKN"
  if (addr.toLowerCase() === WNATIVE) return SHOW_WRAPPED ? WRAPPED_SYM : NATIVE_SYM
  return onchain || "TKN"
}

type Props = {
  value?: UiToken
  onChange: (t: UiToken) => void
  className?: string
}

export default function TokenSelector({ value, onChange, className }: Props) {
  const publicClient = usePublicClient()
  const [customs, setCustoms] = useState<UiToken[]>([])
  const [showImport, setShowImport] = useState(false)
  const [addrInput, setAddrInput] = useState("")
  const [preview, setPreview] = useState<{ ok: boolean; tok?: UiToken; err?: string }>({ ok: false })

  useEffect(() => { setCustoms(getCustomTokens()) }, [])

  const all = useMemo(() => {
    // dedupe by address (or wrapped) — native identified by isNative
    const byKey = new Map<string, UiToken>()
    const push = (t: UiToken) => {
      const key =
        (t.address?.toLowerCase()) ||
        (t.wrapped?.toLowerCase()) ||
        (t.isNative ? `native:${NATIVE_SYM}` : t.symbol.toLowerCase())
      if (!byKey.has(key)) byKey.set(key, t)
    }
    TOKENS.forEach(push)
    customs.forEach(push)
    return Array.from(byKey.values())
  }, [customs])

  // stable key for the <select> option
  const valueKey = useMemo(() => {
    const v = value
    if (!v) return ""
    return (
      v.address?.toLowerCase() ||
      v.wrapped?.toLowerCase() ||
      (v.isNative ? `native:${NATIVE_SYM}` : v.symbol.toLowerCase())
    )
  }, [value])

  async function tryPreview() {
    setPreview({ ok: false })
    if (!isAddress(addrInput)) return setPreview({ ok: false, err: "Invalid address" })
    try {
      const a = addrInput as Address
      const meta = await fetchErc20Meta(publicClient!, a)
      const tok: UiToken = {
        address: a,
        decimals: meta.decimals,
        symbol: labelFor(a, meta.symbol),
        name: meta.name,
      }
      setPreview({ ok: true, tok })
    } catch (e: any) {
      setPreview({ ok: false, err: e?.message || "Read failed" })
    }
  }

  function add() {
    if (!preview.ok || !preview.tok) return
    addCustomToken(preview.tok)
    setCustoms(getCustomTokens())
    onChange(preview.tok)
    setShowImport(false)
    setAddrInput("")
    setPreview({ ok: false })
  }

  return (
    <div className={className ?? "inline-block"}>
      <div className="border rounded px-2 py-1 bg-white/5">
        <select
          value={valueKey}
          onChange={(e) => {
            const key = e.target.value
            if (key === "__import__") {
              setShowImport(true)
              return
            }
            const tok = all.find((t) => {
              const k =
                t.address?.toLowerCase() ||
                t.wrapped?.toLowerCase() ||
                (t.isNative ? `native:${NATIVE_SYM}` : t.symbol.toLowerCase())
              return k === key
            })
            if (tok) onChange(tok)
          }}
        >
          {all.map((t) => {
            const key =
              t.address?.toLowerCase() ||
              t.wrapped?.toLowerCase() ||
              (t.isNative ? `native:${NATIVE_SYM}` : t.symbol.toLowerCase())
            const imported = customs.some((c) => c.address?.toLowerCase() === t.address?.toLowerCase())
            return (
              <option key={key} value={key}>
                {t.symbol}
                {t.address ? ` (${t.address.slice(0, 6)}…${t.address.slice(-4)})` : ""}
                {imported ? " • Imported" : ""}
              </option>
            )
          })}
          <option value="__import__">+ Import token…</option>
        </select>
      </div>

      {/* Inline import (simple modal) */}
      {showImport && (
        <div className="mt-2 p-2 border rounded bg-amber-50">
          <div style={{ display: "grid", gap: 6 }}>
            <strong>Import a token (ERC-20 address)</strong>
            <input
              placeholder="0x…"
              value={addrInput}
              onChange={(e) => setAddrInput(e.target.value.trim())}
              onBlur={tryPreview}
              onKeyDown={(e) => {
                if (e.key === "Enter") tryPreview()
              }}
              className="border rounded px-2 py-1"
            />
            {preview.err && <small style={{ color: "crimson" }}>{preview.err}</small>}
            {preview.ok && preview.tok && (
              <div className="text-sm">
                <div>Symbol: <b>{preview.tok.symbol}</b></div>
                <div>Name: {preview.tok.name}</div>
                <div>Decimals: {preview.tok.decimals}</div>
                <div className="mt-2 text-amber-700">
                  ⚠️ Unlisted token. Double-check the address to avoid honeypots.
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="border rounded px-2 py-1" onClick={add}>Add</button>
                  <button
                    className="border rounded px-2 py-1"
                    onClick={() => {
                      setShowImport(false)
                      setAddrInput("")
                      setPreview({ ok: false })
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
