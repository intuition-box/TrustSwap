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


// ⚠️ Set these two env vars in your frontend .env
// VITE_WETH_ADDRESS=0x51379Cc2C942EE2AE2fF0BD67a7b475F0be39Dcf
// VITE_TOKEN_A=0x124C4E8470eD201Ae896C2DF6ee7152AB7438d80
// VITE_TOKEN_B=0x5Fdd4EdD250b9214D77103881bE0F09812d501D6


export const TOKENS: Currency[] = [
  {
    symbol: 'tTRUST',
    name: 'Intuition Native',
    decimals: 18,
    isNative: true,
    wrapped: import.meta.env.VITE_WETH_ADDRESS as Address,
    logoURI: ''
  },
  {
    symbol: 'WTTRUST',
    name: 'Wrapped tTRUST',
    decimals: 18,
    address: import.meta.env.VITE_WETH_ADDRESS as Address,
    logoURI: ''
  },
  {
    symbol: 'TSWP',
    name: 'TrustSwap Token',
    decimals: 18,
    address: import.meta.env.VITE_TSWP_ADDRESS as Address,
    logoURI: ''
  },
  {
    symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
    address: import.meta.env.VITE_TOKEN_A as Address,
    logoURI: ''
  },
  {
    symbol: 'TKB',
    name: 'Token B',
    decimals: 18,
    address: import.meta.env.VITE_TOKEN_B as Address,
    logoURI: ''
  }
]


export function bySymbol(sym: string) {
  return TOKENS.find(t => t.symbol.toLowerCase() === sym.toLowerCase())
}


export function addrOrWrapped(t: Currency): Address {
  if (t.isNative) return t.wrapped!
  return t.address!
}