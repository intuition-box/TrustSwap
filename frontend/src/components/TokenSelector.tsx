import { useEffect, useMemo, useState } from "react"
import { isAddress, type Address } from "viem"
import { usePublicClient } from "wagmi"
import { fetchErc20Meta } from "../lib/erc20"
import {
  getCustomTokens,
  addCustomToken,
  removeCustomToken,
  // clearCustomTokens, // optional
  type UiToken
} from "../lib/customTokens"
import { TOKENS } from "../tokens/intuit"

const WNATIVE = (import.meta.env.VITE_WNATIVE_ADDRESS || "").toLowerCase()
const NATIVE_SYM = import.meta.env.VITE_NATIVE_SYMBOL || "tTRUST"
const WRAPPED_SYM = import.meta.env.VITE_WRAPPED_SYMBOL || "WTTRUST"
const SHOW_WRAPPED = (import.meta.env.VITE_SHOW_WRAPPED_SYMBOL || "false") === "true"

function labelFor(addr?: string, onchain?: string) {
  if (!addr) return onchain || "TKN"
  if (addr.toLowerCase() === WNATIVE) return SHOW_WRAPPED ? WRAPPED_SYM : NATIVE_SYM
  return onchain || "TKN"
}
const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "")

type Props = {
  value?: UiToken
  onChange: (t: UiToken | undefined) => void
  className?: string
}

export default function TokenSelector({ value, onChange, className }: Props) {
  const publicClient = usePublicClient()
  const [customs, setCustoms] = useState<UiToken[]>([])
  const [showImport, setShowImport] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [addrInput, setAddrInput] = useState("")
  const [preview, setPreview] = useState<{ ok: boolean; tok?: UiToken; err?: string }>({ ok: false })

  // Load + keep in sync across tabs
  useEffect(() => {
    const sync = () => setCustoms(getCustomTokens())
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === "trustswap.customTokens") sync()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

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

  // stable key for <select>
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
        name: meta.name
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

  function handleRemove(addr?: Address) {
    if (!addr) return
    removeCustomToken(addr)
    const updated = getCustomTokens()
    setCustoms(updated)
    // If the removed token is currently selected, clear selection
    if (value?.address && value.address.toLowerCase() === addr.toLowerCase()) {
      onChange(undefined)
    }
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
            if (key === "__manage__") {
              setShowManage((s) => !s)
              return
            }
            const tok = all.find((t) => {
              const k =
                t.address?.toLowerCase() ||
                t.wrapped?.toLowerCase() ||
                (t.isNative ? `native:${NATIVE_SYM}` : t.symbol.toLowerCase())
              return k === key
            })
            onChange(tok)
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
                {t.address ? ` (${short(t.address)})` : ""}
                {imported ? " • Imported" : ""}
              </option>
            )
          })}
          <option value="__import__">+ Import token…</option>
          <option value="__manage__">⚙ Manage imported…</option>
        </select>
      </div>

      {/* Inline import panel */}
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

      {/* Manage imported tokens panel */}
      {showManage && (
        <div className="mt-2 p-2 border rounded bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <strong>Imported tokens</strong>
            <button className="text-sm underline" onClick={() => setShowManage(false)}>Close</button>
          </div>

          {customs.length === 0 ? (
            <div className="text-sm opacity-70">No imported tokens yet.</div>
          ) : (
            <ul className="space-y-2">
              {customs.map((t) => (
                <li key={t.address?.toLowerCase()} className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <div><b>{t.symbol}</b> {t.address && <span className="opacity-70">({short(t.address)})</span>}</div>
                    <div className="opacity-70">{t.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Remove button */}
                    {t.address && (
                      <button
                        className="border rounded px-2 py-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(t.address as Address)}
                        title="Remove from imported list"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Optional nuke-all
          <div className="mt-3">
            <button
              className="text-xs underline opacity-70"
              onClick={() => { clearCustomTokens(); setCustoms(getCustomTokens()); if (value?.address && !TOKENS.find(k => k.address?.toLowerCase() === value.address?.toLowerCase())) onChange(undefined) }}
            >
              Clear all imported tokens
            </button>
          </div> */}
        </div>
      )}
    </div>
  )
}
