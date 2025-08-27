import { Chain } from 'wagmi/chains'

export const intuitChain: Chain = {
  id: 13579,
  name: 'Intuition Testnet',
  network: 'intuition-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Test Trust',
    symbol: 'tTRUST',
  },
  rpcUrls: {
    default: { http: ['https://testnet.rpc.intuition.systems/http'] },
    public: { http: ['https://testnet.rpc.intuition.systems/http'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.intuition.systems' }, // facultatif si pas d’explorer
  },
  testnet: true,
}
