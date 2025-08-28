import { Chain } from '@rainbow-me/rainbowkit'

export const intuitChain: Chain = {
  id: 13579,
  name: 'Intuition Testnet',
  iconUrl: 'https://example.com/icon.png', // remplace par l'URL de ton icône
  iconBackground: '#000000',               // couleur de fond de l’icône
  nativeCurrency: {
    name: 'Test Trust',
    symbol: 'tTRUST',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet.rpc.intuition.systems/http'] },
    public: { http: ['https://testnet.rpc.intuition.systems/http'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.intuition.systems' },
  },
  testnet: true,
} as const
