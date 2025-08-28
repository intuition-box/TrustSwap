import { defineChain } from 'viem'
import { CHAIN_ID, RPC_URL } from '../config/protocol'

export function intuitionChain() {
  const id = CHAIN_ID
  const rpc = RPC_URL
  return defineChain({
    id,
    name: 'Intuition Testnet',
    nativeCurrency: { name: 'tTRUST', symbol: 'tTRUST', decimals: 18 },
    rpcUrls: { default: { http: [rpc] }, public: { http: [rpc] } },
  })
}
