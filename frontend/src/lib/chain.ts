import { defineChain } from 'viem'

export function intuitionChain() {
  const id = Number(import.meta.env.VITE_CHAIN_ID)
  const rpc = String(import.meta.env.VITE_RPC_URL)
  return defineChain({
    id,
    name: 'Intuition Testnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpc] }, public: { http: [rpc] } },
  })
}
