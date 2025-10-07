import { getPublicClient, getWalletClient } from "wagmi/actions";
import { wagmiConfig } from "../../lib/wagmi";
import { CHAIN_ID, MULTIVAULT_ADDRESS } from "./config";

export async function getProtocolClients() {
  const publicClient = getPublicClient(wagmiConfig, { chainId: CHAIN_ID });
  const walletClient = await getWalletClient(wagmiConfig, { chainId: CHAIN_ID });

  if (!publicClient) throw new Error("Missing public client");
  if (!walletClient) throw new Error("Missing wallet client / not connected");

  const receiver = walletClient.account!.address;

  return {
    address: MULTIVAULT_ADDRESS,
    publicClient,
    walletClient,
    receiver,
  } as const;
}