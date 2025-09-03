import { ethers } from "hardhat";
async function main() {
  const FACTORY = process.env.UNIV2_FACTORY!;
  const WNATIVE = process.env.WNATIVE!;
  const R = await (await ethers.getContractFactory("UniswapV2Router02")).deploy(FACTORY, WNATIVE);
  await R.waitForDeployment();
  console.log("Router:", await R.getAddress());
}
main().catch(e=>{console.error(e);process.exit(1)});
