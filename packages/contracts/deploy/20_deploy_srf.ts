import { ethers } from "hardhat";
async function main() {
  const RewardsToken = process.env.TSWP!;
  const srf = await (await ethers.getContractFactory("StakingRewardsFactory")).deploy(RewardsToken);
  await srf.waitForDeployment();
  console.log("SRF:", await srf.getAddress());
}
main().catch(e=>{console.error(e);process.exit(1)});
