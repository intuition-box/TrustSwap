import type { Address } from 'viem'
import { WNATIVE_ADDRESS, TSWP_ADDRESS, PINTU_ADDRESS } from '../config/protocol'
import tTrustIcon from "../assets/trust.png";

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
    wrapped: WNATIVE_ADDRESS as Address,
    logoURI: tTrustIcon as string,
  },
  {
    symbol: 'WTTRUST',
    name: 'Wrapped tTRUST',
    decimals: 18,
    address: WNATIVE_ADDRESS as Address,
    logoURI: ''
  },
  {
    symbol: 'TSWP',
    name: 'TrustSwap Token',
    decimals: 18,
  address: TSWP_ADDRESS as Address,
    logoURI: ''
  },
  {
    symbol: 'PINTU',
    name: 'PEPE INTU',
    decimals: 18,
    address: PINTU_ADDRESS as Address,
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