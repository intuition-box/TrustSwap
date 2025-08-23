import { ethers } from "hardhat"
import fs from "fs"
import path from "path"

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deployer:", deployer.address)

  // 1) WETH9
  const WETH9 = await ethers.getContractFactory("WETH9")
  const weth = await WETH9.deploy()
  await weth.waitForDeployment()
  const wethAddr = await weth.getAddress()
  console.log("WETH9:", wethAddr)

  // 2) UniswapV2Factory
  const Factory = await ethers.getContractFactory("UniswapV2Factory")
  const factory = await Factory.deploy(deployer.address)
  await factory.waitForDeployment()
  const factoryAddr = await factory.getAddress()
  console.log("Factory:", factoryAddr)

  // 3) UniswapV2Router02
  const Router = await ethers.getContractFactory("UniswapV2Router02")
  const router = await Router.deploy(factoryAddr, wethAddr)
  await router.waitForDeployment()
  const routerAddr = await router.getAddress()
  console.log("Router02:", routerAddr)

  // 4) Deux tokens de test
  const decimals = 18n
  const supply = 1_000_000n * 10n ** decimals

  const Token = await ethers.getContractFactory("TestToken")
  const tokenA = await Token.deploy("TokenA", "TKA", supply, deployer.address)
  await tokenA.waitForDeployment()
  const tokenAAddr = await tokenA.getAddress()

  const tokenB = await Token.deploy("TokenB", "TKB", supply, deployer.address)
  await tokenB.waitForDeployment()
  const tokenBAddr = await tokenB.getAddress()

  console.log("TokenA:", tokenAAddr)
  console.log("TokenB:", tokenBAddr)

  // Save deployments
  const outDir = path.join(__dirname, "..", "deployments")
  fs.mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, "intuition.json")
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        WETH9: wethAddr,
        UniswapV2Factory: factoryAddr,
        UniswapV2Router02: routerAddr,
        TokenA: tokenAAddr,
        TokenB: tokenBAddr,
        deployer: deployer.address
      },
      null,
      2
    )
  )

  console.log("\nSaved to", file)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
