import { ethers } from "hardhat";
import { parseUnits } from "ethers";
async function main() {
  const ROUTER = process.env.UNIV2_ROUTER!, A = process.env.TSWP!, B = process.env.WNATIVE!;
  const amtA = parseUnits(process.env.AMOUNT_A || "10000", 18);
  const amtB = parseUnits(process.env.AMOUNT_B || "100", 18);
  const r = await ethers.getContractAt("UniswapV2Router02", ROUTER);
  const [signer] = await ethers.getSigners();
  const a = await ethers.getContractAt("IERC20", A); await (await a.approve(ROUTER, amtA)).wait();
  const b = await ethers.getContractAt("IERC20", B); await (await b.approve(ROUTER, amtB)).wait();
  const dl = Math.floor(Date.now()/1000)+600;
  await (await r.addLiquidity(A,B,amtA,amtB,amtA,amtB,await signer.getAddress(),dl)).wait();
  console.log("Liquidity added");
}
main().catch(e=>{console.error(e);process.exit(1)});
