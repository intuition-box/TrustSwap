import { ethers } from "hardhat";
async function main() {
  const Pair = await ethers.getContractFactory("UniswapV2Pair");
  const initCodeHash = ethers.keccak256(Pair.bytecode);
  console.log("INIT_CODE_PAIR_HASH =", initCodeHash);
}
main().catch((e)=>{console.error(e);process.exit(1)});
