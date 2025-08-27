// scripts/32_create_sr_for_lp.ts
import { ethers } from "hardhat";

const UniV2FactoryABI = [
  { name: "getPair", type: "function", stateMutability: "view",
    inputs: [{name:"tokenA",type:"address"}, {name:"tokenB",type:"address"}],
    outputs:[{name:"pair",type:"address"}] },
] as const;

async function main() {
  const [signer] = await ethers.getSigners();

  const SRF  = process.env.SRF!;               // StakingRewardsFactory
  const LP   = process.env.LP!;                // adresse de la LP pair (UniswapV2Pair)
  const DIST = process.env.DISTRIBUTOR || signer.address; // rewardsDistribution (par défaut: EOA courant)

  if (!SRF || !LP) {
    throw new Error("Env manquantes: SRF, LP (et éventuellement DISTRIBUTOR)");
  }

  console.log("Signer:         ", signer.address);
  console.log("SRF (factory):  ", SRF);
  console.log("LP (stakingTok):", LP);
  console.log("Distributor:    ", DIST);

  // Attacher la StakingRewardsFactory
  const srf = await ethers.getContractAt("StakingRewardsFactory", SRF, signer);

  // Si la factory expose owner(), on peut afficher un warning si non-owner (facultatif)
  try {
    const owner = await (srf as any).owner();
    console.log("SRF.owner      :", owner);
  } catch { /* no-op */ }

  // Créer le SR pour cette LP
  console.log("→ calling create(LP, distributor) …");
  const tx = await (srf as any)["create(address,address)"](LP, DIST);
  const rc = await tx.wait();
  console.log("create() tx    :", rc?.hash);

  // Récupérer l’adresse du SR créé
  const srAddr: string = await (srf as any)["stakingRewardsByStakingToken(address)"](LP);
  if (!srAddr || srAddr === ethers.ZeroAddress) {
    throw new Error("stakingRewardsByStakingToken(LP) a renvoyé l'adresse zéro.");
  }
  console.log("StakingRewards :", srAddr);
}

main().catch((e) => { console.error(e); process.exit(1); });
