import { ethers } from "hardhat";
import { parseUnits } from "ethers";
async function main() {
  const SR = process.env.SR!, TSWP = process.env.TSWP!, AMOUNT = parseUnits(process.env.REWARD_AMOUNT || "100000", 18);
  const token = await ethers.getContractAt("IERC20", TSWP);
  await (await token.approve(SR, AMOUNT)).wait();
  const sr = await ethers.getContractAt("StakingRewards", SR);
  await (await sr.notifyRewardAmount(AMOUNT)).wait();
  console.log("Rewards notified:", AMOUNT.toString());
}
main().catch(e=>{console.error(e);process.exit(1)});
