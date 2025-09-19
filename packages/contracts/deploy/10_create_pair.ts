import { ethers } from "hardhat";
async function main() {
  const FACTORY = process.env.UNIV2_FACTORY!, A = process.env.TSWP!, B = process.env.WNATIVE!;
  const f = await ethers.getContractAt("UniswapV2Factory", FACTORY);
  let pair = await f.getPair(A,B);
  if (pair === ethers.ZeroAddress) {
    await (await f.createPair(A,B)).wait();
    pair = await f.getPair(A,B);
    console.log("Pair created:", pair);
  } else {
    console.log("Pair exists:", pair);
  }
}
main().catch(e=>{console.error(e);process.exit(1)});
