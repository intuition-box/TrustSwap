import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const TSWP = process.env.TSWP as string;
  const DURATION = Number(process.env.REWARDS_DURATION_SECONDS ?? "600");

  console.log("Deployer:", deployer.address);
  console.log("TSWP:", TSWP);
  console.log("defaultDuration:", DURATION);

  if (!TSWP) throw new Error("env TSWP manquant");

  const SRF = await ethers.getContractFactory("StakingRewardsFactory");
  const srf = await SRF.deploy(TSWP, DURATION);
  await srf.waitForDeployment();
  const srfAddr = await srf.getAddress();
  console.log("StakingRewardsFactory:", srfAddr);

  const outFile = path.join(__dirname, "..", "deployments", "intuition.json");
  let current: any = {};
  try { current = JSON.parse(fs.readFileSync(outFile, "utf8")); } catch {}
  current.SRF = srfAddr;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(current, null, 2));
  console.log("Updated", outFile);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
