import { Address, PublicClient, erc20Abi } from "viem"

export async function fetchErc20Meta(client: PublicClient, address: Address) {
  const [symbol, name, decimals] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }).catch(() => "???"),
    client.readContract({ address, abi: erc20Abi, functionName: "name" }).catch(() => "Unknown Token"),
    client.readContract({ address, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
  ])
  const dec = typeof decimals === "bigint" ? Number(decimals) : Number(decimals ?? 18)
  return { symbol: String(symbol), name: String(name), decimals: dec }
}
