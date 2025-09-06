import INTUITION_13579 from "./intuition-testnet.json" assert { type: "json" };

export type HexAddr = `0x${string}`;

export interface Addresses {
  UniswapV2Factory: HexAddr;
  UniswapV2Router02: HexAddr;
  deployer: HexAddr;
  router: HexAddr;
  NATIVE_PLACEHOLDER: HexAddr;
  TSWP: HexAddr;
  WTTRUST: HexAddr;
  StakingRewardsFactory: HexAddr;
}

const BOOK: Record<number, Addresses> = {
  13579: INTUITION_13579 as Addresses
};

export function getAddresses(chainId: number = 13579): Addresses {
  const entry = BOOK[chainId];
  if (!entry) {
    throw new Error(`No addresses for chainId=${chainId}`);
  }
  return entry;
}

// Raccourci par défaut
export const addresses = getAddresses(13579);
