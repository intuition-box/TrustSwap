import { createConfig, http } from 'wagmi'
import { intuitionChain } from './chain'

export const chain = intuitionChain()

export const config = createConfig({
  chains: [chain],
  transports: { [chain.id]: http(chain.rpcUrls.default.http[0]) },
})
