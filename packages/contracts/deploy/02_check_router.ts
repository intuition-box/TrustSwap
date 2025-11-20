import { ethers } from "hardhat";

async function main() {
  const routerAddr = "0x5123208Aa3C6A37615327a8c479a5e1654c0200E";

  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const router = Router.attach(routerAddr);

  const factory = await router.factory();
  const wnative = await router.WETH(); // in UniswapV2, function name is WETH

  console.log("Router:", routerAddr);
  console.log("  factory:", factory);
  console.log("  WNATIVE:", wnative);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
