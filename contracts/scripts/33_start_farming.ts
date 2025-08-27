// scripts/33_start_farming.ts
import { ethers } from "hardhat";

const ERC20_ABI = [
  { name:"decimals", type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint8"}] },
  { name:"balanceOf", type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}] },
  { name:"transfer", type:"function", stateMutability:"nonpayable", inputs:[{type:"address"},{type:"uint256"}], outputs:[{type:"bool"}] },
] as const;

async function main() {
  const [signer] = await ethers.getSigners();

  const SR        = process.env.SR!;                 // adresse du StakingRewards
  const REWARD    = process.env.REWARD_TOKEN!;       // token de reward (ex: TSWP)
  const AMOUNT    = process.env.AMOUNT!;             // en unités "humaines" (ex: "10000")
  const DURATION  = process.env.DURATION!;           // en secondes (ex: "864000" pour 10 jours)
  if (!SR || !REWARD || !AMOUNT || !DURATION) {
    throw new Error("Env manquantes: SR, REWARD_TOKEN, AMOUNT, DURATION");
  }

  console.log("Signer         :", signer.address);
  console.log("SR             :", SR);
  console.log("REWARD_TOKEN   :", REWARD);
  console.log("AMOUNT (human) :", AMOUNT);
  console.log("DURATION (s)   :", DURATION);

  const sr  = await ethers.getContractAt("StakingRewards", SR, signer);
  const rw  = new ethers.Contract(REWARD, ERC20_ABI, signer);

  // 1) Décimales & parsing du montant
  const dec: number = Number(await rw.decimals());
  const amtWei = ethers.parseUnits(AMOUNT, dec);

  // 2) (Optionnel mais recommandé) régler la durée
  //    setRewardsDuration *doit* être appelé quand la période précédente est terminée.
  console.log("→ setRewardsDuration …");
  try {
    const txDur = await (sr as any).setRewardsDuration(BigInt(DURATION));
    await txDur.wait();
    console.log("rewardsDuration =", DURATION, "seconds");
  } catch (e:any) {
    console.warn("setRewardsDuration a échoué (période en cours ?). On continue quand même.");
  }

  // 3) Transférer les tokens de reward vers le SR
  const balBefore: bigint = await rw.balanceOf(SR);
  console.log("SR reward balance (before):", balBefore.toString());

  console.log(`→ transfer(${SR}, ${amtWei.toString()}) …`);
  const txTr = await rw.transfer(SR, amtWei);
  await txTr.wait();

  const balAfter: bigint = await rw.balanceOf(SR);
  console.log("SR reward balance (after): ", balAfter.toString());

  // 4) Notifier le montant pour démarrer la période
  console.log("→ notifyRewardAmount …");
  const txN = await (sr as any).notifyRewardAmount(amtWei);
  const rcN = await txN.wait();
  console.log("notify tx        :", rcN?.hash);

  // 5) Lecture de l’état (rewardRate / periodFinish)
  const rewardRate: bigint = await (sr as any).rewardRate();
  const periodFinish: bigint = await (sr as any).periodFinish();
  console.log("rewardRate       :", rewardRate.toString(), "token/s");
  console.log("periodFinish     :", periodFinish.toString(), " (unix)");
  console.log("periodFinish (≈) :", new Date(Number(periodFinish) * 1000).toLocaleString());
}

main().catch((e) => { console.error(e); process.exit(1); });
