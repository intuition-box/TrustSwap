import { ethers } from "hardhat";

/**
 * ENV:
 *  SRF        = 0x... (adresse SRF v2)
 *  STAKING_TOKEN = 0x... (LP)
 *  REWARDS_DISTRIBUTION = 0x... (EOA qui notify)
 *  SR_OWNER   = 0x... (EOA/multisig qui doit posséder le SR)
 */
async function main() {
  const SRF = process.env.SRF!;
  const STAKING_TOKEN = process.env.STAKING_TOKEN!;
  const REWARDS_DISTRIBUTION = process.env.REWARDS_DISTRIBUTION!;
  const SR_OWNER = process.env.SR_OWNER!; // mets ton EOA ou multisig

  if (!SRF || !STAKING_TOKEN || !REWARDS_DISTRIBUTION || !SR_OWNER) {
    throw new Error("Env manquantes: SRF, STAKING_TOKEN, REWARDS_DISTRIBUTION, SR_OWNER");
  }

  const [signer] = await ethers.getSigners();
  const srf = await ethers.getContractAt("StakingRewardsFactoryV2", SRF, signer);

  const owner = await srf.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Caller n'est pas owner SRF. Owner=${owner}`);
  }

  const existing = await srf.stakingRewardsByStakingToken(STAKING_TOKEN);
  if (existing !== ethers.ZeroAddress) {
    throw new Error(`Cette SRF a déjà une SR pour cette LP: ${existing}`);
  }

  console.log("→ create(...)");
  const tx = await srf.create(STAKING_TOKEN, REWARDS_DISTRIBUTION, SR_OWNER);
  await tx.wait();

  const srAddr = await srf.stakingRewardsByStakingToken(STAKING_TOKEN);
  console.log("New SR:", srAddr);

  // Sanity check
  const sr = await ethers.getContractAt("StakingRewards", srAddr, signer);
  console.log("SR.owner          =", await sr.owner());
  console.log("SR.rewardsToken   =", await sr.rewardsToken());
  console.log("SR.stakingToken   =", await sr.stakingToken());
  console.log("SR.rewardsDuration=", (await sr.rewardsDuration()).toString()); // doit être 864000 si DEFAULT_DURATION=864000
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
