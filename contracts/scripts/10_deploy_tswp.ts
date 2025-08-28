// scripts/10_deploy_tswp.ts
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const premintTo = (process.env.TSWP_TREASURY || deployer.address).trim();
  console.log("Premint to:", premintTo);

  // Déploie TSWP
  const TSWP = await ethers.getContractFactory("TSWP");
  const tswp = await TSWP.deploy(premintTo);
  await tswp.waitForDeployment();
  const tswpAddr = await tswp.getAddress();
  console.log("TSWP deployed at:", tswpAddr);

  // Sauvegarde dans deployments/intuition.json
  const outFile = path.join(__dirname, "..", "deployments", "intuition.json");
  let current: any = {};
  try { current = JSON.parse(fs.readFileSync(outFile, "utf8")); } catch {}
  current.TSWP = tswpAddr;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(current, null, 2));
  console.log("Updated", outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
