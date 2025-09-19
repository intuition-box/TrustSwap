import { ethers } from "hardhat";
async function main() {
  const ROUTER = process.env.UNIV2_ROUTER!;
  const r = await ethers.getContractAt("UniswapV2Router02", ROUTER);
  console.log("factory:", await r.factory());
  console.log("WETH():", await r.WETH());
}
main().catch(e=>{console.error(e);process.exit(1)});
