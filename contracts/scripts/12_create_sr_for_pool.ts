// scripts/12_create_sr_for_pool.ts
import { ethers } from "hardhat";

const UniV2FactoryABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" }
    ],
    name: "getPair",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function main() {
  const [signer] = await ethers.getSigners();

  const SRF  = process.env.SRF!;
  const FACT = process.env.UNIV2_FACTORY!;
  const A    = process.env.TOKEN_A!;
  const B    = process.env.TOKEN_B!;
  const DIST = process.env.REWARDS_DISTRIBUTOR || signer.address;

  console.log("Signer:", signer.address);
  console.log("SRF:", SRF);
  console.log("Factory:", FACT);
  console.log("A:", A);
  console.log("B:", B);
  console.log("Distributor:", DIST);

  if (!SRF || !FACT || !A || !B) {
    throw new Error("Env manquantes: SRF, UNIV2_FACTORY, TOKEN_A, TOKEN_B");
  }

  // 1) Résoudre la LP
  const factory = new ethers.Contract(FACT, UniV2FactoryABI, signer);
  const lp: string = await factory.getPair(A, B);
  if (lp === ethers.ZeroAddress) {
    throw new Error("La pair n'existe pas. Crée-la d'abord (AddLiquidity).");
  }
  console.log("LP =", lp);

  // 2) Attacher ta StakingRewardsFactory
  const srf = await ethers.getContractAt("StakingRewardsFactory", SRF);

  // (facultatif) vérifier le owner (au cas où la création est restreinte)
  try {
    const owner = await (srf as any).owner();
    console.log("SRF.owner =", owner);
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.warn("⚠️ Attention: vous n'êtes pas owner. Si create() est restreinte, ça va revert.");
    }
  } catch {
    // pas grave si la factory n'a pas owner()
  }

  // 3) Appeler create(LP, distributor)
  console.log("→ calling create(address,address) with (LP, distributor)");
  const tx = await (srf as any)["create(address,address)"](lp, DIST);
  const rc = await tx.wait();
  console.log("create tx:", rc?.hash);

  // 4) Lire l’adresse du StakingRewards pour cette LP
  const srAddr: string = await (srf as any)["stakingRewardsByStakingToken(address)"](lp);
  if (!srAddr || srAddr === ethers.ZeroAddress) {
    throw new Error("stakingRewardsByStakingToken(LP) a renvoyé l'adresse zéro.");
  }
  console.log("StakingRewards for pool:", srAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
