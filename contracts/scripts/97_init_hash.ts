import { ethers } from "hardhat";
async function main() {
  const f = await ethers.getContractFactory("UniswapV2Pair");
  console.log("INIT_CODE_PAIR_HASH =", ethers.keccak256(f.bytecode));
}
main();