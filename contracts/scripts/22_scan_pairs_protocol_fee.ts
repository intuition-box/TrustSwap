import "dotenv/config"
import { createPublicClient, http } from "viem"

const RPC = process.env.RPC || process.env.RPC_URL!
const FACTORY = (process.env.FACTORY || process.env.VITE_FACTORY_ADDRESS || "").trim() as `0x${string}`
const TREASURY = (process.env.TREASURY || process.env.VITE_PROTOCOL_TREASURY || "").trim() as `0x${string}`
const LIMIT = Number(process.env.PAIRS_LIMIT || 50)

if (!RPC || !FACTORY || !TREASURY) {
  throw new Error("Missing env: RPC/FACTORY/TREASURY")
}

const factoryAbi = [
  { type:"function", name:"allPairsLength", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}]},
  { type:"function", name:"allPairs", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"address"}]},
  { type:"function", name:"feeTo", stateMutability:"view", inputs:[], outputs:[{type:"address"}]},
] as const

const pairAbi = [
  { type:"function", name:"token0", stateMutability:"view", inputs:[], outputs:[{type:"address"}]},
  { type:"function", name:"token1", stateMutability:"view", inputs:[], outputs:[{type:"address"}]},
  { type:"function", name:"getReserves", stateMutability:"view", inputs:[], outputs:[{type:"uint112"},{type:"uint112"},{type:"uint32"}]},
  { type:"function", name:"totalSupply", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}]},
  { type:"function", name:"kLast", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}]},
  { type:"function", name:"symbol", stateMutability:"view", inputs:[], outputs:[{type:"string"}]},
  { type:"function", name:"decimals", stateMutability:"view", inputs:[], outputs:[{type:"uint8"}]},
] as const

const erc20Abi = [
  { type:"function", name:"symbol", stateMutability:"view", inputs:[], outputs:[{type:"string"}]},
  { type:"function", name:"decimals", stateMutability:"view", inputs:[], outputs:[{type:"uint8"}]},
  { type:"function", name:"balanceOf", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}]},
] as const

function sqrtBI(n: bigint): bigint {
  if (n <= 0n) return 0n
  let x0 = n
  let x1 = (n >> 1n) + 1n
  while (x1 < x0) { x0 = x1; x1 = (x1 + n / x1) >> 1n }
  return x0
}

async function main() {
  const pub = createPublicClient({ transport: http(RPC) })

  const feeTo = await pub.readContract({ address: FACTORY, abi: factoryAbi, functionName: "feeTo" }) as string
  console.log("factory.feeTo:", feeTo)
  if (feeTo.toLowerCase() !== TREASURY.toLowerCase()) {
    console.warn("⚠️ Warning: feeTo != TREASURY env")
  }

  const len = await pub.readContract({ address: FACTORY, abi: factoryAbi, functionName: "allPairsLength" }) as bigint
  const count = Number(len)
  console.log("Pairs:", count)

  const upto = Math.min(count, LIMIT)
  for (let i = 0; i < upto; i++) {
    const pair = await pub.readContract({ address: FACTORY, abi: factoryAbi, functionName: "allPairs", args: [BigInt(i)] }) as `0x${string}`
    const [token0, token1] = await Promise.all([
      pub.readContract({ address: pair, abi: pairAbi, functionName: "token0" }) as Promise<`0x${string}`>,
      pub.readContract({ address: pair, abi: pairAbi, functionName: "token1" }) as Promise<`0x${string}`>,
    ])
    const [[r0, r1], totalSupply, kLast] = await Promise.all([
      pub.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" }) as Promise<[bigint, bigint, number]>,
      pub.readContract({ address: pair, abi: pairAbi, functionName: "totalSupply" }) as Promise<bigint>,
      pub.readContract({ address: pair, abi: pairAbi, functionName: "kLast" }) as Promise<bigint>,
    ])
    const [sym0, sym1] = await Promise.all([
      pub.readContract({ address: token0, abi: erc20Abi, functionName: "symbol" }).catch(()=> "T0") as Promise<string>,
      pub.readContract({ address: token1, abi: erc20Abi, functionName: "symbol" }).catch(()=> "T1") as Promise<string>,
    ])
    const lpBal = await pub.readContract({ address: pair, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY] }) as bigint

    const k = r0 * r1
    const rootK = sqrtBI(k)
    const rootKLast = sqrtBI(kLast)
    let pending = 0n
    if (kLast !== 0n && rootK > rootKLast) {
      const numerator = totalSupply * (rootK - rootKLast)
      const denominator = rootK * 5n + rootKLast
      pending = numerator / denominator // LP tokens that would be minted to TREASURY on next mint/burn
    }

    console.log(`\n#${i} ${sym0}-${sym1}  pair=${pair}`)
    console.log(`   LP balance (treasury): ${lpBal.toString()}`)
    console.log(`   kLast: ${kLast.toString()}`)
    console.log(`   pending protocol LP (if mint now): ${pending.toString()}`)
  }
}

main().catch((e)=>{ console.error(e); process.exit(1) })
