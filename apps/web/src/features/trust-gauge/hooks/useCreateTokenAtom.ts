// apps/web/src/features/trust-gauge/hooks/useCreateTokenAtom.ts
import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from "wagmi";
import type { Address } from "viem";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  getAddress,
  stringToHex,
} from "viem";
import { createAtoms } from "@0xintuition/protocol";
import {
  CHAIN_ID,              // Intuition testnet chain id
  MULTIVAULT_ADDRESS,     // MultiVault on Intuition testnet
  DEFAULT_AMOUNTS,        // includes CREATE_ATOM
} from "../config";

// Minimal Intuition Testnet chain spec for viem fallbacks
const INTUITION_RPC_HTTP = "https://testnet.rpc.intuition.systems/http";
const intuitionChain = {
  id: CHAIN_ID,
  name: "Intuition Testnet",
  nativeCurrency: { name: "tTRUST", symbol: "tTRUST", decimals: 18 },
  rpcUrls: { default: { http: [INTUITION_RPC_HTTP] } },
} as const;

function caip19(chainId: number, token: Address) {
  return `caip19:eip155:${chainId}/erc20:${token.toLowerCase()}`;
}

export function useCreateTokenAtom() {
  const wagmiPublic = usePublicClient({ chainId: CHAIN_ID });
  const { data: wagmiWallet } = useWalletClient();
  const { address, isConnected, chainId: activeChainId, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Best-effort public client (fallback to a direct viem client if Wagmi has none)
  const getPublicClient = useCallback(() => {
    if (wagmiPublic) return wagmiPublic;
    return createPublicClient({
      chain: intuitionChain,
      transport: http(INTUITION_RPC_HTTP),
    });
  }, [wagmiPublic]);

  // Best-effort wallet client (wagmi -> connector -> window.ethereum)
  const getWalletClient = useCallback(async () => {
    if (wagmiWallet) return wagmiWallet;
    if (connector && typeof connector.getWalletClient === "function") {
      try {
        const wc = await connector.getWalletClient({ chainId: CHAIN_ID } as any);
        if (wc) return wc;
      } catch {}
    }
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        return createWalletClient({
          chain: intuitionChain,
          transport: custom((window as any).ethereum),
        });
      } catch {}
    }
    return null;
  }, [wagmiWallet, connector]);

  // Ensure wallet is on Intuition Testnet; add the chain if missing
  const ensureOnIntuition = useCallback(async () => {
    if (activeChainId === CHAIN_ID) return;
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: CHAIN_ID });
        return;
      }
    } catch {
      // fall through
    }
    // Try adding the chain manually
    const eth = (window as any)?.ethereum;
    if (eth?.request) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: "Intuition Testnet",
            nativeCurrency: { name: "tTRUST", symbol: "tTRUST", decimals: 18 },
            rpcUrls: [INTUITION_RPC_HTTP],
          },
        ],
      });
    }
  }, [activeChainId, switchChainAsync]);

  const createTokenAtom = useCallback(
    async ({ tokenAddress }: { tokenAddress: Address }) => {
      const publicClient = getPublicClient();
      const walletClient = await getWalletClient();

      if (!walletClient) throw new Error("Wallet client unavailable");
      if (!isConnected || !address) throw new Error("Wallet not connected");

      await ensureOnIntuition();

      setLoading(true);
      setError(null);

      try {
        const token = getAddress(tokenAddress);

        // Build CAIP-19 for Intuition Testnet (your token is on Intuition now)
        const uri = caip19(CHAIN_ID, token);

        // Convert to bytes hex for bytes[]
        const dataHex = stringToHex(uri);

        const stake = DEFAULT_AMOUNTS.CREATE_ATOM;

        // Call the core function: createAtoms(bytes[] data, uint256[] assets)
        const txHash = await createAtoms(
          { address: MULTIVAULT_ADDRESS, walletClient, publicClient },
          {
            args: [[dataHex], [stake]],
            value: stake,
          }
        );

        return { txHash, uri, stake };
      } catch (e: any) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [address, isConnected, getPublicClient, getWalletClient, ensureOnIntuition]
  );

  return { createTokenAtom, loading, error };
}
