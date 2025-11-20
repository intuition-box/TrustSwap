import INTUITION_13579 from "./intuition-testnet.json" assert { type: "json" };
import INTUITION_MAINNET from "./intuition-mainnet.json" assert { type: "json" };

export type HexAddr = `0x${string}`;

export interface Addresses {
  UniswapV2Factory: HexAddr;
  UniswapV2Router02: HexAddr;
  deployer: HexAddr;
  router: HexAddr;
  NATIVE_PLACEHOLDER: HexAddr;
  TSWP: HexAddr;
  WTTRUST: HexAddr;
  WTRUST: HexAddr;
  StakingRewardsFactory: HexAddr;
}

export const INTUITION_TESTNET_CHAIN_ID = 13579;
export const INTUITION_MAINNET_CHAIN_ID = 1155;

const BOOK: Record<number, Addresses> = {
  [INTUITION_TESTNET_CHAIN_ID]: INTUITION_13579 as Addresses,
  [INTUITION_MAINNET_CHAIN_ID]: INTUITION_MAINNET as Addresses,
};

export function getAddresses(chainId: number = INTUITION_TESTNET_CHAIN_ID): Addresses {
  const entry = BOOK[chainId];
  if (!entry) {
    throw new Error(`No addresses for chainId=${chainId}`);
  }
  return entry;
}

// Kept for backward compatibility, but frontend should prefer getAddresses(useChainId())
export const addresses = getAddresses(INTUITION_TESTNET_CHAIN_ID);
