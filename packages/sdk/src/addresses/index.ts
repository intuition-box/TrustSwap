import INTUITION_424242 from "./intuition-testnet.json" assert { type: "json" };

export type HexAddr = `0x${string}`;

export interface Addresses {
  UniswapV2Factory: HexAddr;
  UniswapV2Router02: HexAddr;
  deployer: HexAddr;
  router: HexAddr;
  TSWP: HexAddr;
  WTTRUST: HexAddr;
  SRF: HexAddr;
}

const BOOK: Record<number, Addresses> = {
  424242: INTUITION_424242 as Addresses
};

export function getAddresses(chainId: number = 424242): Addresses {
  const entry = BOOK[chainId];
  if (!entry) {
    throw new Error(`No addresses for chainId=${chainId}`);
  }
  return entry;
}

// Raccourci par défaut
export const addresses = getAddresses(424242);
