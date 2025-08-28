// scripts/14_read_sr.ts
import { ethers } from "hardhat";

async function main() {
  const SR = process.env.SR!;
  const [me] = await ethers.getSigners();
  const sr = await ethers.getContractAt("StakingRewards", SR);
  
  console.log("owner =", await sr.owner());
  console.log("stakingToken:", await sr.stakingToken());
  console.log("rewardsToken:", await sr.rewardsToken());
  console.log("rewardsDuration:", (await sr.rewardsDuration()).toString());
  console.log("periodFinish:", (await sr.periodFinish()).toString());
  console.log("rewardRate:", (await sr.rewardRate()).toString());
  console.log("earned(me):", (await sr.earned(me.address)).toString());
}

main().catch((e)=>{ console.error(e); process.exit(1); });
