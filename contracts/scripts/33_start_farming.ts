// scripts/33_start_farming.ts
import { ethers } from "hardhat";

const ERC20 = [
  { inputs: [{name:"spender",type:"address"},{name:"amount",type:"uint256"}], name:"approve", outputs:[{type:"bool"}], stateMutability:"nonpayable", type:"function" },
  { inputs: [{name:"to",type:"address"},{name:"amount",type:"uint256"}], name:"transfer", outputs:[{type:"bool"}], stateMutability:"nonpayable", type:"function" },
  { inputs: [{name:"owner",type:"address"},{name:"spender",type:"address"}], name:"allowance", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [{name:"account",type:"address"}], name:"balanceOf", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
] as const;

const SR_ABI = [
  { inputs: [], name:"rewardsDistribution", outputs:[{type:"address"}], stateMutability:"view", type:"function" },
  { inputs: [], name:"rewardsToken",       outputs:[{type:"address"}], stateMutability:"view", type:"function" },
  { inputs: [], name:"stakingToken",       outputs:[{type:"address"}], stateMutability:"view", type:"function" },
  { inputs: [], name:"periodFinish",       outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [], name:"rewardsDuration",    outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [], name:"rewardRate",         outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [{name:"_rewardsDuration",type:"uint256"}], name:"setRewardsDuration", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs: [{name:"reward",type:"uint256"}], name:"notifyRewardAmount", outputs:[], stateMutability:"nonpayable", type:"function" },
] as const;

function bn(x: string | number) { return BigInt(x as any); }

async function main() {
  const [signer] = await ethers.getSigners();

  const SR_ADDR         = process.env.SR!;                // StakingRewards
  const REWARD_TOKEN    = process.env.REWARD_TOKEN!;      // TSWP
  const AMOUNT_HUMAN    = process.env.AMOUNT || "0";      // ex: "1000"
  const DURATION_SEC    = process.env.DURATION || "";     // ex: "864000" (10 jours)

  if (!SR_ADDR || !REWARD_TOKEN || !AMOUNT_HUMAN) {
    throw new Error("Env manquantes: SR, REWARD_TOKEN, AMOUNT, (DURATION optionnel)");
  }

  const amount = ethers.parseUnits(AMOUNT_HUMAN, 18);
  const sr     = new ethers.Contract(SR_ADDR, SR_ABI, signer);
  const token  = new ethers.Contract(REWARD_TOKEN, ERC20, signer);

  console.log("Signer         :", signer.address);
  console.log("SR             :", SR_ADDR);
  console.log("REWARD_TOKEN   :", REWARD_TOKEN);
  console.log("AMOUNT (human) :", AMOUNT_HUMAN);
  if (DURATION_SEC) console.log("DURATION (s)   :", DURATION_SEC);

  // --- Lecture d’état
  const [dist, rwToken, stToken, pFinish, rDur, rRate] = await Promise.all([
    sr.rewardsDistribution().catch(()=>ethers.ZeroAddress),
    sr.rewardsToken().catch(()=>ethers.ZeroAddress),
    sr.stakingToken().catch(()=>ethers.ZeroAddress),
    sr.periodFinish().catch(()=>0n),
    sr.rewardsDuration().catch(()=>0n),
    sr.rewardRate().catch(()=>0n),
  ]);

  console.log("rewardsDistribution :", dist);
  console.log("rewardsToken        :", rwToken);
  console.log("stakingToken        :", stToken);
  console.log("periodFinish        :", pFinish.toString());
  console.log("rewardsDuration     :", rDur.toString());
  console.log("rewardRate          :", rRate.toString());

  if (dist.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Le caller n'est pas rewardsDistribution. Requis: ${dist}`);
  }
  if (rwToken.toLowerCase() !== REWARD_TOKEN.toLowerCase()) {
    throw new Error(`REWARD_TOKEN ne correspond pas à SR.rewardsToken()`);
  }

  // --- Durée (si fournie). NB: beaucoup d’implémentations refusent setRewardsDuration si la période n’est pas terminée.
  if (DURATION_SEC) {
    try {
      console.log("→ setRewardsDuration …");
      const tx = await sr.setRewardsDuration(bn(DURATION_SEC));
      await tx.wait();
      console.log("OK setRewardsDuration");
    } catch (e:any) {
      console.warn("setRewardsDuration a échoué (période en cours ?). On continue quand même.");
    }
  }

  // --- Afficher allowance & soldes pour diagnostiquer
  const [allowance, balSigner, balSR] = await Promise.all([
    token.allowance(signer.address, SR_ADDR),
    token.balanceOf(signer.address),
    token.balanceOf(SR_ADDR),
  ]);
  console.log("allowance(signer→SR):", allowance.toString());
  console.log("signer reward bal    :", balSigner.toString());
  console.log("SR reward bal (avant):", balSR.toString());

  // --- Tentative 1: modèle PULL (approve + notifyRewardAmount)
  try {
    if (allowance < amount) {
      const txA = await token.approve(SR_ADDR, amount);
      await txA.wait();
      console.log("approve OK");
    }
    console.log("→ notifyRewardAmount (mode PULL) …");
    const txN = await sr.notifyRewardAmount(amount);
    await txN.wait();
    const balSR2 = await token.balanceOf(SR_ADDR);
    console.log("SR reward bal (après notify):", balSR2.toString());
    console.log("✅ Farming démarré (pull).");
    return;
  } catch (e:any) {
    console.warn("notify (pull) a revert. On essaie le mode PUSH…");
  }

  // --- Tentative 2: modèle PUSH (transfer → notify)
  // (Certaines implémentations exigent que les fonds soient présents AVANT d’appeler notify.)
  if (balSigner < amount) throw new Error("Solde reward insufisant chez le distributeur.");
  console.log(`→ transfer(SR, ${amount.toString()}) …`);
  const txT = await token.transfer(SR_ADDR, amount);
  await txT.wait();
  const balSR3 = await token.balanceOf(SR_ADDR);
  console.log("SR reward bal (après transfer):", balSR3.toString());

  console.log("→ notifyRewardAmount (mode PUSH) …");
  const txN2 = await sr.notifyRewardAmount(amount);
  await txN2.wait();
  console.log("✅ Farming démarré (push).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
