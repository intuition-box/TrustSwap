import type { Address, Chain } from "viem";
import type { Addresses } from "@trustswap/sdk";
import { createPublicClient, http, erc20Abi } from "viem";

export type TokenInfo = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
  hidden?: boolean;
};

type TokenModule = {
  NATIVE_PLACEHOLDER: Address;
  WNATIVE_ADDRESS: Address;
  TOKENLIST: TokenInfo[];
  isNative: (addr?: string) => boolean;
  isWrapped: (addr?: string) => boolean;
  toWrapped: (addr: Address) => Address;
  buildPath: (path: Address[]) => Address[];
  getTokenByAddress: (addr: string | Address) => TokenInfo;
  getTokenByAddressOrFallback: (addr: Address) => TokenInfo;
  getDefaultPair: () => { tokenIn: TokenInfo; tokenOut: TokenInfo };
  getOrFetchToken: (address: Address) => Promise<TokenInfo>;
  getTokenMetaSafe: (addr: Address) => Promise<TokenInfo>;
  toUIAddress: (addr?: Address) => Address | undefined;
  toUIList: (list: TokenInfo[]) => TokenInfo[];
  getTokenForUI: (addr?: Address) => TokenInfo | null;
};

export function createTokenModule(chain: Chain, addrBook: Addresses): TokenModule {
  const NATIVE_PLACEHOLDER = addrBook.NATIVE_PLACEHOLDER as Address;
  const WNATIVE_ADDRESS = addrBook.WTTRUST as Address;

  const TOKENLIST: TokenInfo[] = [
    {
      address: NATIVE_PLACEHOLDER,
      symbol: chain.nativeCurrency?.symbol ?? "tTRUST",
      name: chain.nativeCurrency?.name ?? "Native TRUST",
      decimals: 18,
      isNative: true,
    },
    {
      address: addrBook.TSWP as Address,
      symbol: "TSWP",
      name: "TrustSwap",
      decimals: 18,
    },
    {
      address: WNATIVE_ADDRESS,
      symbol: "WTTRUST",
      name: "Wrapped TRUST",
      decimals: 18,
      hidden: false,
    },
  ];

  const TOKEN_CACHE: Record<string, TokenInfo> = {};
  for (const t of TOKENLIST) TOKEN_CACHE[t.address.toLowerCase()] = t;

  const client = createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });

  function findToken(addr: string): TokenInfo | null {
    return TOKEN_CACHE[addr.toLowerCase()] || null;
  }

  const isNative = (addr?: string) =>
    !!addr && addr.toLowerCase() === NATIVE_PLACEHOLDER.toLowerCase();

  const toWrapped = (addr: Address): Address =>
    isNative(addr) ? WNATIVE_ADDRESS : addr;

  const buildPath = (path: Address[]): Address[] =>
    path.map(toWrapped) as Address[];

  const isWrapped = (addr?: string) =>
    !!addr && addr.toLowerCase() === WNATIVE_ADDRESS.toLowerCase();

  const toUIAddress = (addr?: Address): Address | undefined =>
    !addr ? undefined : isWrapped(addr) ? NATIVE_PLACEHOLDER : addr;

  function getTokenByAddress(addr: string | Address): TokenInfo {
    const t = TOKENLIST.find(
      t => t.address.toLowerCase() === addr.toLowerCase(),
    );
    if (!t) throw new Error(`Token not in tokenlist: ${addr}`);
    return t;
  }

  function getDefaultPair(): { tokenIn: TokenInfo; tokenOut: TokenInfo } {
    const native = TOKENLIST.find(t => t.isNative) ?? TOKENLIST[0];
    const other =
      TOKENLIST.find(t => t.address !== native.address && !t.hidden) ??
      native;
    return { tokenIn: native, tokenOut: other };
  }

  async function getOrFetchToken(address: Address): Promise<TokenInfo> {
    const cached = findToken(address);
    if (cached) return cached;

    const [symbol, decimals, name] = await Promise.all([
      client
        .readContract({ address, abi: erc20Abi, functionName: "symbol" })
        .catch(() => "TKN"),
      client
        .readContract({ address, abi: erc20Abi, functionName: "decimals" })
        .catch(() => 18),
      client
        .readContract({ address, abi: erc20Abi, functionName: "name" })
        .catch(() => "Unknown"),
    ]);

    const info: TokenInfo = {
      address,
      symbol: String(symbol),
      name: String(name),
      decimals: Number(decimals),
    };

    TOKEN_CACHE[address.toLowerCase()] = info;
    return info;
  }

  function toUIList(list: TokenInfo[]): TokenInfo[] {
    return list.filter(t => !t.hidden);
  }

  function getTokenForUI(addr?: Address): TokenInfo | null {
    if (!addr) return null;
    const uiAddr = toUIAddress(addr)!;
    const t = TOKENLIST.find(
      x => x.address.toLowerCase() === uiAddr.toLowerCase(),
    );
    return t ?? null;
  }

  async function getTokenMetaSafe(addr: Address): Promise<TokenInfo> {
    if (isNative(addr)) {
      return {
        address: NATIVE_PLACEHOLDER,
        symbol: chain.nativeCurrency?.symbol ?? "tTRUST",
        name: chain.nativeCurrency?.name ?? "Native TRUST",
        decimals: 18,
        isNative: true,
      };
    }

    const cached = TOKEN_CACHE[addr.toLowerCase()];
    if (cached) return cached;

    return await getOrFetchToken(addr);
  }

  function getTokenByAddressOrFallback(addr: Address): TokenInfo {
    const hit = TOKENLIST.find(
      t => t.address.toLowerCase() === addr.toLowerCase(),
    );
    if (hit) return hit;

    return {
      address: addr,
      symbol: "UNK",
      name: "Unknown",
      decimals: 18,
    };
  }

  return {
    NATIVE_PLACEHOLDER,
    WNATIVE_ADDRESS,
    TOKENLIST,
    isNative,
    isWrapped,
    toWrapped,
    buildPath,
    getTokenByAddress,
    getTokenByAddressOrFallback,
    getDefaultPair,
    getOrFetchToken,
    getTokenMetaSafe,
    toUIAddress,
    toUIList,
    getTokenForUI,
  };
}
