import { ethers } from "hardhat";
async function main() {
  const FACTORY = process.env.UNIV2_FACTORY!, FEE_TO = process.env.FEE_TO!;
  const f = await ethers.getContractAt("UniswapV2Factory", FACTORY);
  await (await f.setFeeTo(FEE_TO)).wait();
  console.log("feeTo set:", FEE_TO);
}
main().catch(e=>{console.error(e);process.exit(1)});
