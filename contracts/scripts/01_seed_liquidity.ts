import { ethers } from "hardhat"
import fs from "fs"
import path from "path"

async function main() {
  const [deployer] = await ethers.getSigners()
  const file = path.join(__dirname, "..", "deployments", "intuition.json")
  const d = JSON.parse(fs.readFileSync(file, "utf8"))

  const tokenA = await ethers.getContractAt("TestToken", d.TokenA)
  const tokenB = await ethers.getContractAt("TestToken", d.TokenB)
  const router = await ethers.getContractAt("UniswapV2Router02", d.UniswapV2Router02)

  const amountA = ethers.parseUnits("10000", 18)
  const amountB = ethers.parseUnits("10000", 18)

  // approve
  await (await tokenA.approve(await router.getAddress(), amountA)).wait()
  await (await tokenB.approve(await router.getAddress(), amountB)).wait()

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10

  const tx = await router.addLiquidity(
    await tokenA.getAddress(),
    await tokenB.getAddress(),
    amountA,
    amountB,
    0,
    0,
    deployer.address,
    deadline
  )
  await tx.wait()
  console.log("Liquidity added.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
