// apps/web/src/features/trust-gauge/hooks/useCreateTokenAtom.ts
// English-only comments
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
import { useTxAlerts, useAlerts } from "../../alerts/Alerts";

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

  const txAlerts = useTxAlerts();
  const alerts = useAlerts();

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
      // fall through to manual add
    }
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
        // Build data
        const token = getAddress(tokenAddress);
        const uri = caip19(CHAIN_ID, token);
        const dataHex = stringToHex(uri);
        const stake = DEFAULT_AMOUNTS.CREATE_ATOM;

        // Send tx
        const txHash = await createAtoms(
          { address: MULTIVAULT_ADDRESS, walletClient, publicClient },
          {
            args: [[dataHex], [stake]],
            value: stake,
          }
        );

        // Alerts: pending
        txAlerts.onSubmit(txHash, /* explorerUrl */ undefined, CHAIN_ID);

        // Wait receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "success") {
          txAlerts.onSuccess(txHash, /* explorerUrl */ undefined, CHAIN_ID);
        } else {
          txAlerts.onError(txHash, "Transaction reverted", () => createTokenAtom({ tokenAddress }));
        }

        return { txHash, uri, stake };
      } catch (e: any) {
        const msg = String(e?.shortMessage || e?.message || e);

        // Map explicit user cancellation
        if (e?.code === 4001 || /user rejected|user denied|request rejected|cancel/i.test(msg)) {
          alerts.warn("Transaction cancelled by user.");
        } else {
          // Generic tx failure
          txAlerts.onError(undefined, msg, () => createTokenAtom({ tokenAddress }));
        }

        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [address, isConnected, getPublicClient, getWalletClient, ensureOnIntuition, txAlerts, alerts]
  );

  return { createTokenAtom, loading, error };
}
