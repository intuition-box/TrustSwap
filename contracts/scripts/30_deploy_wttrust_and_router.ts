import { ethers } from "hardhat"

async function main() {
  const FACTORY = process.env.UNIV2_FACTORY as string
  if (!FACTORY) throw new Error("Missing env UNIV2_FACTORY (factory address)")

  const [deployer] = await ethers.getSigners()
  console.log("Deployer:", deployer.address)
  console.log("Using Factory:", FACTORY)

  // 1) Deploy WTTRUST
  const WTTRUST = await ethers.getContractFactory("WTTRUST")
  const w = await WTTRUST.deploy()
  await w.waitForDeployment()
  const wAddr = await w.getAddress()
  console.log("WTTRUST:", wAddr)

  // 2) Deploy new Router02(factory, WTTRUST)
  const Router = await ethers.getContractFactory("UniswapV2Router02")
  const router = await Router.deploy(FACTORY, wAddr)
  await router.waitForDeployment()
  const routerAddr = await router.getAddress()
  console.log("Router02:", routerAddr)

  console.log("\n.env suggestions:")
  console.log("VITE_WNATIVE_ADDRESS=", wAddr)
  console.log("VITE_ROUTER_ADDRESS =", routerAddr)
  console.log("VITE_NATIVE_SYMBOL  = tTRUST")
  console.log("VITE_WRAPPED_SYMBOL = WTTRUST")
  console.log("VITE_SHOW_WRAPPED_SYMBOL=false")
}

main().catch((e) => { console.error(e); process.exit(1) })
