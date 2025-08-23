import { formatUnits } from 'viem'

export const MAX_UINT = (2n ** 256n) - 1n

type FmtOpts = { dp?: number; compact?: boolean }

export function fmtAmount(bi: bigint, decimals = 18, opts: FmtOpts = {}) {
  const { dp = 6, compact = false } = opts
  const n = Number(formatUnits(bi, decimals))
  const base: Intl.NumberFormatOptions = { maximumFractionDigits: dp }
  const opt = compact ? { ...base, notation: 'compact' as const } : base
  return n.toLocaleString(undefined, opt)
}

export function fmtLP(bi: bigint, opts?: FmtOpts) {
  return fmtAmount(bi, 18, opts)
}

export function fmtAllowance(bi: bigint) {
  return bi > (MAX_UINT / 2n) ? '∞ (Unlimited)' : fmtLP(bi, { compact: true })
}

/** 0.00 – 100.00 % */
export function fmtPct(numer: bigint, denom: bigint, dp = 2) {
  if (denom === 0n) return '0%'
  const pct = Number(numer) / Number(denom) * 100
  return `${pct.toFixed(dp)}%`
}

/** address short 0x1234…ABCD */
export function shortAddr(a?: string) {
  if (!a) return '—'
  return a.slice(0, 6) + '…' + a.slice(-4)
}
