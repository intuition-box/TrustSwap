import { ethers } from "hardhat";

async function main() {
  const SRF_ADDR        = process.env.SRF!;                  // StakingRewardsFactory
  const STAKING_TOKEN   = process.env.STAKING_TOKEN!;        // LP UniswapV2Pair
  const REWARDS_DIST    = process.env.REWARDS_DISTRIBUTION!; // EOA qui fera notify
  const NEW_DEFAULT     = BigInt(process.env.NEW_DEFAULT || "864000"); // 10 jours
  const RESET_DEFAULT   = process.env.RESET_DEFAULT || "";   // ex: "300" (optionnel)

  if (!SRF_ADDR || !STAKING_TOKEN || !REWARDS_DIST) {
    throw new Error("Env manquantes: SRF, STAKING_TOKEN, REWARDS_DISTRIBUTION, (NEW_DEFAULT, RESET_DEFAULT optionnels)");
  }

  const [signer] = await ethers.getSigners();
  const srf = await ethers.getContractAt("StakingRewardsFactory", SRF_ADDR, signer);

  // 1) Vérifs
  const owner = await srf.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Caller n'est pas owner de la SRF. Owner SRF: ${owner}`);
  }

  // 2) Set default rewards duration = 10 jours
  const curDefault = await srf.defaultRewardsDuration();
  if (curDefault !== NEW_DEFAULT) {
    const tx = await srf.setDefaultRewardsDuration(NEW_DEFAULT);
    await tx.wait();
  }
  console.log("Default SRF duration =", (await srf.defaultRewardsDuration()).toString());

  // 3) Create SR (naîtra avec rewardsDuration = NEW_DEFAULT)
  const txC = await srf.create(STAKING_TOKEN, REWARDS_DIST);
  const rc  = await txC.wait();

  // Récupère l’adresse de la SR créée
  const srAddr = await srf.stakingRewardsByStakingToken(STAKING_TOKEN);
  console.log("New SR =", srAddr);

  // Sanity check
  const sr = await ethers.getContractAt("StakingRewards", srAddr, signer);
  const rDur = await sr.rewardsDuration();
  console.log("New SR.rewardsDuration =", rDur.toString()); // doit être 864000

  // 4) (Optionnel) Remettre le default à 300 s pour les prochains pools
  if (RESET_DEFAULT) {
    const txR = await srf.setDefaultRewardsDuration(BigInt(RESET_DEFAULT));
    await txR.wait();
    console.log("Default SRF duration reset to", (await srf.defaultRewardsDuration()).toString());
  }

  console.log("✅ SR (10 jours) créée via SRF. Prête pour notifyRewardAmount.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
