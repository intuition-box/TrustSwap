import { ethers, run } from "hardhat";

/**
 * ENV:
 *  REWARDS_TOKEN     = 0x... (TSWP)
 *  DEFAULT_DURATION  = 864000 (10j)  [ou ce que tu veux]
 *  NEW_OWNER         = 0x... (optionnel: owner de la SRF v2)
 */
async function main() {
  const REWARDS_TOKEN = process.env.REWARDS_TOKEN!;
  const DEFAULT_DURATION = BigInt(process.env.DEFAULT_DURATION || "864000");
  const NEW_OWNER = process.env.NEW_OWNER;

  if (!REWARDS_TOKEN) throw new Error("Env manquante: REWARDS_TOKEN");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const F = await ethers.getContractFactory("StakingRewardsFactoryV2");
  const srf = await F.deploy(REWARDS_TOKEN, DEFAULT_DURATION);
  await srf.waitForDeployment();

  const addr = await srf.getAddress();
  console.log("SRFv2 deployed at:", addr);
  console.log("rewardsToken        :", await srf.rewardsToken());
  console.log("defaultRewardsDuration:", (await srf.defaultRewardsDuration()).toString());
  console.log("owner               :", await srf.owner());

  if (NEW_OWNER && NEW_OWNER.toLowerCase() !== (await srf.owner()).toLowerCase()) {
    const tx = await srf.setOwner(NEW_OWNER);
    await tx.wait();
    console.log("SRFv2 owner ->", await srf.owner());
  }

  try {
    await run("verify:verify", {
      address: addr,
      constructorArguments: [REWARDS_TOKEN, DEFAULT_DURATION],
    });
    console.log("Verify OK");
  } catch (e:any) {
    console.warn("Verify skipped/failed:", e?.message || e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
