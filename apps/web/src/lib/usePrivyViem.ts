import { useEffect, useMemo, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
} from 'viem';
import { INTUITION } from '@trustswap/sdk';


function makeViemChain() {
  return {
    id: INTUITION.id,
    name: INTUITION.name,
    nativeCurrency: INTUITION.nativeCurrency,
    rpcUrls: {
      default: { http: INTUITION.rpcUrls.default.http },
      public: { http: INTUITION.rpcUrls.default.http },
    },
    blockExplorers: INTUITION['blockExplorers']
      ? INTUITION['blockExplorers']
      : undefined,
  } as const;
}

export function usePrivyViem() {
  const { wallets } = useWallets();
  const [chainId, setChainId] = useState<number | null>(null);

  const viemChain = useMemo(makeViemChain, []);
  const rpcUrl = viemChain.rpcUrls.default.http[0];

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: viemChain,
        transport: http(rpcUrl),
      }),
    [viemChain, rpcUrl]
  );

  const wallet = useMemo(
    () => wallets.find(w => (w as any).walletClientType === 'privy') ?? wallets[0],
    [wallets]
  );

  const [walletClient, account] = useMemo(() => {
    if (!wallet?.address) return [null, undefined] as const;

    const provider =
      wallet.getEthereumProvider?.() ?? (wallet as any).provider ?? null;
    if (!provider) return [null, undefined] as const;

    const wc = createWalletClient({
      chain: viemChain,
      transport: custom(provider as any),
    });

    return [wc, wallet.address as Address] as const;
  }, [wallet, viemChain]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const provider = wallet?.getEthereumProvider
          ? await wallet.getEthereumProvider()
          : (wallet as any)?.provider;
        if (!provider?.request) return;

        const hex = await provider.request({ method: 'eth_chainId' });
        const currentId =
          typeof hex === 'string' ? Number.parseInt(hex, 16) : Number(hex);
        if (!cancelled) setChainId(currentId ?? null);

        if (currentId !== viemChain.id) {
          await provider
            .request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x' + viemChain.id.toString(16) }],
            })
            .catch(async () => {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x' + viemChain.id.toString(16),
                    chainName: viemChain.name,
                    nativeCurrency: viemChain.nativeCurrency,
                    rpcUrls: viemChain.rpcUrls.default.http,
                    blockExplorerUrls:
                      (viemChain as any).blockExplorers?.default?.url
                        ? [(viemChain as any).blockExplorers.default.url]
                        : undefined,
                  },
                ],
              });
            });
          if (!cancelled) setChainId(viemChain.id);
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet, viemChain]);

  return { publicClient, walletClient, account, chainId };
}
