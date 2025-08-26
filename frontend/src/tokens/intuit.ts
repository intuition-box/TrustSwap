import type { Address } from 'viem'


export type Currency = {
symbol: string
name: string
decimals: number
// native coin (gas): no ERC-20 address, but we keep a pointer to its wrapped ERC-20
isNative?: boolean
address?: Address
wrapped?: Address
logoURI?: string
}



export const TOKENS: Currency[] = [
  {
    symbol: 'tTRUST',
    name: 'Intuition Native',
    decimals: 18,
    isNative: true,
    wrapped: import.meta.env.VITE_WNATIVE_ADDRESS as Address,
    logoURI: ''
  },
  {
    symbol: 'WTTRUST',
    name: 'Wrapped tTRUST',
    decimals: 18,
    address: import.meta.env.VITE_WNATIVE_ADDRESS as Address,
    logoURI: ''
  },
  {
    symbol: 'TSWP',
    name: 'TrustSwap Token',
    decimals: 18,
    address: import.meta.env.VITE_TSWP_ADDRESS as Address,
    logoURI: ''
  },

]


export function bySymbol(sym: string) {
  return TOKENS.find(t => t.symbol.toLowerCase() === sym.toLowerCase())
}


export function addrOrWrapped(t: Currency): Address {
  if (t.isNative) return t.wrapped!
  return t.address!
}