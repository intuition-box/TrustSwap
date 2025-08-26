import "dotenv/config"
import { createPublicClient, createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"

const RPC = process.env.RPC!
const FACTORY = (process.env.FACTORY || "").trim() as `0x${string}`
const PK = process.env.PRIVATE_KEY!
const ZERO = "0x0000000000000000000000000000000000000000" as const

const factoryAbi = [
  { type: "function", name: "feeTo",        stateMutability: "view",       inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "feeToSetter",  stateMutability: "view",       inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "setFeeTo",     stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] }
] as const

async function main() {
  if (!RPC || !FACTORY || !PK) throw new Error("Missing env RPC/FACTORY/PRIVATE_KEY")
  const account = privateKeyToAccount(`0x${PK}`)
  const pub = createPublicClient({ transport: http(RPC) })
  const wallet = createWalletClient({ account, transport: http(RPC) })

  const [feeTo, feeToSetter] = await Promise.all([
    pub.readContract({ address: FACTORY, abi: factoryAbi, functionName: "feeTo" }) as Promise<string>,
    pub.readContract({ address: FACTORY, abi: factoryAbi, functionName: "feeToSetter" }) as Promise<string>,
  ])
  console.log({ feeTo, feeToSetter, signer: account.address })
  if (feeToSetter.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error("Signer is not feeToSetter.")
  }

  console.log("Disabling protocol fee (set feeTo => 0)")
  await wallet.writeContract({ address: FACTORY, abi: factoryAbi, functionName: "setFeeTo", args: [ZERO] })
  const after = await pub.readContract({ address: FACTORY, abi: factoryAbi, functionName: "feeTo" })
  console.log("feeTo is now:", after)
}
main().catch((e) => { console.error(e); process.exit(1) })
