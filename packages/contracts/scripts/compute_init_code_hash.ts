import fs from "node:fs";
import { keccak256 } from "ethers";
async function main() {
  const art = JSON.parse(fs.readFileSync("artifacts/contracts/uniswapv2/core/UniswapV2Pair.sol/UniswapV2Pair.json","utf8"));
  console.log("INIT_CODE_PAIR_HASH:", keccak256(art.deployedBytecode));
}
main();
