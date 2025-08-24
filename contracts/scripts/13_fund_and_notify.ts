// scripts/13_fund_and_notify.ts
import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const TSWP = process.env.TSWP!; // token de reward
  const SR   = process.env.SR!;   // adresse StakingRewards de ta pool
  const AMT  = process.env.AMOUNT || "10000"; // quantité à distribuer (pour test)

  console.log("Signer:", signer.address);
  console.log("TSWP:", TSWP);
  console.log("SR:", SR);
  console.log("Amount:", AMT);

  const token = await ethers.getContractAt("TSWP", TSWP);
  const sr    = await ethers.getContractAt("StakingRewards", SR);

  const amount = ethers.parseUnits(AMT, 18);

  // 1) Approve le contrat SR pour tirer les rewards
  const a = await token.approve(SR, amount);
  await a.wait();
  console.log("approved");

  // 2) Lance / étend la période de rewards
  const n = await sr.notifyRewardAmount(amount);
  const rc = await n.wait();
  console.log("notified, tx:", rc?.hash);

  // 3) Sanity check
  const rewardRate = await sr.rewardRate();
  const finish = await sr.periodFinish();
  console.log("rewardRate:", rewardRate.toString());
  console.log("periodFinish:", finish.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
