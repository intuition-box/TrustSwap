import { ethers } from "hardhat";
async function main() {
  const SR = process.env.SR!; // adresse du StakingRewards pour la LP
  const DURATION = Number(process.env.REWARDS_DURATION || 7*24*3600);
  const sr = await ethers.getContractAt("StakingRewards", SR);
  await (await sr.setRewardsDuration(DURATION)).wait();
  console.log("RewardsDuration set:", DURATION, "s");
}
main().catch(e=>{console.error(e);process.exit(1)});
