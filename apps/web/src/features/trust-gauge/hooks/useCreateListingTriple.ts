// apps/web/src/features/trust-gauge/hooks/useCreateListingTriple.ts
// English-only comments
import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from "wagmi";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
} from "viem";
import { createTriples } from "@0xintuition/protocol";
import {
  CHAIN_ID,
  MULTIVAULT_ADDRESS,
  PREDICATE_LISTED_ON_VAULT_ID,
  TRUSTSWAP_VAULT_ID,
  DEFAULT_AMOUNTS,
} from "../config";

// Minimal Intuition Testnet chain spec for viem fallbacks
const INTUITION_RPC_HTTP = "https://testnet.rpc.intuition.systems/http";
const intuitionChain = {
  id: CHAIN_ID,
  name: "Intuition Testnet",
  nativeCurrency: { name: "tTRUST", symbol: "tTRUST", decimals: 18 },
  rpcUrls: { default: { http: [INTUITION_RPC_HTTP] } },
} as const;

export function useCreateListingTriple() {
  const wagmiPublic = usePublicClient({ chainId: CHAIN_ID });
  const { data: wagmiWallet } = useWalletClient();
  const { address, isConnected, chainId: activeChainId, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // best-effort public client
  const getPublicClient = useCallback(() => {
    if (wagmiPublic) return wagmiPublic;
    return createPublicClient({ chain: intuitionChain, transport: http(INTUITION_RPC_HTTP) });
  }, [wagmiPublic]);

  // best-effort wallet client
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

  // ensure we are on Intuition testnet
  const ensureOnIntuition = useCallback(async () => {
    if (activeChainId === CHAIN_ID) return;
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: CHAIN_ID });
        return;
      }
    } catch {}
    const eth = (window as any)?.ethereum;
    if (eth?.request) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${CHAIN_ID.toString(16)}`,
          chainName: "Intuition Testnet",
          nativeCurrency: { name: "tTRUST", symbol: "tTRUST", decimals: 18 },
          rpcUrls: [INTUITION_RPC_HTTP],
        }],
      });
    }
  }, [activeChainId, switchChainAsync]);

  const createListingTriple = useCallback(
    async ({ subjectId, stakeWei }: { subjectId: `0x${string}`; stakeWei?: bigint }) => {
      const publicClient = getPublicClient();
      const walletClient = await getWalletClient();

      if (!walletClient) throw new Error("Wallet client unavailable");
      if (!isConnected || !address) throw new Error("Wallet not connected");

      await ensureOnIntuition();

      setLoading(true);
      setError(null);

      try {
        if (!PREDICATE_LISTED_ON_VAULT_ID) throw new Error("Missing PREDICATE_LISTED_ON_VAULT_ID");
        if (!TRUSTSWAP_VAULT_ID) throw new Error("Missing TRUSTSWAP_VAULT_ID");

        const s = subjectId as `0x${string}`;
        const p = PREDICATE_LISTED_ON_VAULT_ID as `0x${string}`;
        const o = TRUSTSWAP_VAULT_ID as `0x${string}`;
        const amt = stakeWei ?? DEFAULT_AMOUNTS.CREATE_TRIPLE;

        // createTriples(subjects[], predicates[], objects[], assets[]) with value = sum(assets)
        const txHash = await createTriples(
          { address: MULTIVAULT_ADDRESS as Address, walletClient, publicClient },
          {
            args: [[s], [p], [o], [amt]],
            value: amt,
          }
        );

        if (import.meta.env.DEV) {
          console.log("[useCreateListingTriple] sent", { subjectId: s, predicateId: p, objectId: o, amt, txHash });
        }

        return { txHash, subjectId: s, predicateId: p, objectId: o, stake: amt };
      } catch (e: any) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [getPublicClient, getWalletClient, isConnected, address, ensureOnIntuition]
  );

  return { createListingTriple, loading, error };
}
