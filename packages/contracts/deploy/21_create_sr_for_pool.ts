import { ethers } from "hardhat";
async function main() {
  const FACTORY = process.env.UNIV2_FACTORY!, SRF = process.env.SRF!, TSWP = process.env.TSWP!, WNATIVE = process.env.WNATIVE!;
  const f = await ethers.getContractAt("UniswapV2Factory", FACTORY);
  const lp = await f.getPair(TSWP, WNATIVE);
  if (lp === ethers.ZeroAddress) throw new Error("LP not found, create pair first");
  const srf = await ethers.getContractAt("StakingRewardsFactory", SRF);
  const tx = await srf.deploy(lp); // ou deploy(rewardToken, lp) selon ton impl
  await tx.wait();
  const info = await srf.stakingRewardsInfoByStakingToken(lp);
  console.log("SR for LP:", lp, "->", info.stakingRewards || info[0]);
}
main().catch(e=>{console.error(e);process.exit(1)});
