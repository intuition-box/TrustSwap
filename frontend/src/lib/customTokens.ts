import type { Address } from "viem"

export type UiToken = {
  symbol: string
  name: string
  decimals: number
  address?: Address        // ERC-20 address
  isNative?: boolean       // p.ex. tTRUST
  wrapped?: Address        // wrapper (WTTRUST) si isNative
}

const KEY = "trustswap.customTokens"

function safeParse<T>(json: string | null, fallback: T): T {
  try { return json ? JSON.parse(json) as T : fallback } catch { return fallback }
}

export function getCustomTokens(): UiToken[] {
  return safeParse<UiToken[]>(localStorage.getItem(KEY), [])
}

export function addCustomToken(t: UiToken) {
  const addr = (t.address || "").toLowerCase()
  const list = getCustomTokens().filter(x => (x.address || "").toLowerCase() !== addr)
  list.unshift(t)
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))) // garde au plus 50
}

export function removeCustomToken(addr: Address) {
  const list = getCustomTokens().filter(x => (x.address || "").toLowerCase() !== addr.toLowerCase())
  localStorage.setItem(KEY, JSON.stringify(list))
}
