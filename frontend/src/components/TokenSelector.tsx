import { useEffect, useMemo, useRef, useState } from "react"
import { isAddress, type Address } from "viem"
import { usePublicClient } from "wagmi"
import { fetchErc20Meta } from "../lib/erc20"
import {
  getCustomTokens,
  addCustomToken,
  removeCustomToken,
  type UiToken
} from "../lib/customTokens"
import { TOKENS } from "../tokens/intuit"
import styles from "../styles/swap.module.css"
import tokenLogo from "../images/token.png"
import loupe from "../images/loupe.png"
import arrow from "../images/arrow.png"
import plus from "../images/add.png"
import corbeille from "../images/delete.png"

import { createPortal } from "react-dom"
import { WNATIVE_ADDRESS, NATIVE_SYMBOL, WRAPPED_SYMBOL, SHOW_WRAPPED_SYMBOL } from '../config/protocol'

const WNATIVE = (WNATIVE_ADDRESS || "").toLowerCase()
const NATIVE_SYM = NATIVE_SYMBOL || "tTRUST"
const WRAPPED_SYM = WRAPPED_SYMBOL || "WTTRUST"
const SHOW_WRAPPED = SHOW_WRAPPED_SYMBOL

function labelFor(addr?: string, onchain?: string) {
  if (!addr) return onchain || "TKN"
  if (addr.toLowerCase() === WNATIVE) return SHOW_WRAPPED ? WRAPPED_SYM : NATIVE_SYM
  return onchain || "TKN"
}


const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "")

type Props = {
  value?: UiToken
  onChange: (t: UiToken | null) => void
  className?: string
}

export default function TokenSelector({ value, onChange, className }: Props) {
  const publicClient = usePublicClient()
  const [customs, setCustoms] = useState<UiToken[]>([])
  const [showImport, setShowImport] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [addrInput, setAddrInput] = useState("")
  const [preview, setPreview] = useState<{ ok: boolean; tok?: UiToken; err?: string }>({ ok: false })

  // dropdown state + portal positioning
  const [showDropdown, setShowDropdown] = useState(false)
  const [portalPos, setPortalPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  // refs
  const originButtonRef = useRef<HTMLButtonElement | null>(null)

  // Keep customs in sync
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
    if (value?.address && value.address.toLowerCase() === addr.toLowerCase()) {
      onChange(null)
    }
  }

  // --- helpers to open/close dropdown and compute portal position ---
  const openDropdown = () => {
    const btn = originButtonRef.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setPortalPos({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      })
    } else {
      setPortalPos({ top: 100, left: 100, width: 200, height: 40 })
    }
    setShowDropdown(true)
  }

  const closeDropdown = () => {
    setShowDropdown(false)
    setPortalPos(null)
  }

  // keep portal position updated on scroll / resize while open
  useEffect(() => {
    if (!showDropdown) return
    const handler = () => {
      const btn = originButtonRef.current
      if (btn) {
        const rect = btn.getBoundingClientRect()
        setPortalPos({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        })
      }
    }
    window.addEventListener("scroll", handler, true)
    window.addEventListener("resize", handler)
    return () => {
      window.removeEventListener("scroll", handler, true)
      window.removeEventListener("resize", handler)
    }
  }, [showDropdown])

  return (
    <>
      {/* Portal: overlay + floating button+dropdown rendered into document.body */}
      {showDropdown && portalPos && createPortal(
        <>
          {/* overlay full-screen */}
          <div
            className={styles.overlay}
            onClick={closeDropdown}
            role="presentation"
          />

          {/* floating wrapper placed exactly where the original button is */}
          <div
            style={{
              position: "fixed",
              top: portalPos.top,
              left: portalPos.left,
              width: portalPos.width,
              zIndex: 10001,
              pointerEvents: "none" /* wrapper itself should not block events except its children */
            }}
          >
            {/* interactive area (button + dropdown) */}

            
            <div style={{ position: "relative", pointerEvents: "auto" }}>
              
              {/* Replica of the button (interactive) */}
              <button
                className={styles.selectSwap}
                onClick={() => (showDropdown ? closeDropdown() : openDropdown())}
                aria-expanded={showDropdown}
                style={{ width: "100%" }}
              >
                {value?.symbol || "Select token"}
                <img
                  src={arrow}
                  alt="toggle"
                  className={`${styles.arrowSelect} ${showDropdown ? styles.arrowOpen : ""}`}
                />
              </button>

              {/* dropdown positioned under the button */}
              <div
                className={styles.dropdownMenu}
                
              >


        <div className={styles.importContainer}>
          <div style={{ display: "grid", gap: 6 }}>
          <div className={styles.searchInputContainer}>
          <img
                  src={loupe}
                  alt="toggle"
                  className={styles.loupe}
                />
            <input
              placeholder="0x…"
              value={addrInput}
              onChange={(e) => setAddrInput(e.target.value.trim())}
              onBlur={tryPreview}
              onKeyDown={(e) => { if (e.key === "Enter") tryPreview() }}
              className={styles.searchInput}
            />
            </div>
            {preview.ok && preview.tok && <small style={{ color: "crimson" }}>{preview.err}</small>}
            {preview.ok && preview.tok && (
              <div className={styles.resultSearchToken}>
                 <img src={tokenLogo} alt="Logo" className={styles.logoTokenDrop} />
                <div>{preview.tok.symbol}</div>
  
             
                <div className={styles.containerImportToken}>
                  <button className={styles.addTokenBtn} onClick={add}>
                  <img
                  src={plus}
                  alt="toggle"
                  className={styles.addLogo}
                />
                    Import
                  </button>
                  <button
                    className={styles.cancelBtnImport}
                    onClick={() => { setShowImport(false); setAddrInput(""); setPreview({ ok: false }) }}
                  >
                      <img
                  src={corbeille}
                  alt="toggle"
                  className={styles.deleteLogo}
                />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
<div className={styles.trait}></div>

                {all.map((t) => {
                  const key =
                    t.address?.toLowerCase() ||
                    t.wrapped?.toLowerCase() ||
                    (t.isNative ? `native:${NATIVE_SYM}` : t.symbol.toLowerCase())
                  const imported = customs.some(
                    (c) => c.address?.toLowerCase() === t.address?.toLowerCase()
                  )
                  return (
                    <div
                      key={key}
                      className={styles.dropdownItem}
                      onClick={() => {
                        onChange(t)
                        closeDropdown()
                      }}
                    >
                      <img src={tokenLogo} alt="Logo" className={styles.logoTokenDrop} />
                      {t.symbol}
                      {t.address ? ` (${short(t.address)})` : ""}
                      {imported ? " • Imported" : ""}
                    </div>
                  )
                })}
    

                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    setShowManage(true)
                    closeDropdown()
                  }}
                >
                  ⚙ Manage imported…
                </div>


              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* original select container stays in the DOM to preserve layout.
          while dropdown is open we hide it (visibility: hidden) to avoid duplication shift */}
      <div className={styles.selectContainer}>
        <img src={tokenLogo} alt="Logo" className={styles.logoToken} />
        <button
          ref={originButtonRef}
          className={styles.selectSwap}
          onClick={() => (showDropdown ? closeDropdown() : openDropdown())}
         
        >
          {value?.symbol || "Select token"}
          <img
            src={arrow}
            alt="toggle"
            className={`${styles.arrowSelect} ${showDropdown ? styles.arrowOpen : ""}`}
          />
        </button>
      </div>


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
        </div>
      )}
    </>
  )
}
