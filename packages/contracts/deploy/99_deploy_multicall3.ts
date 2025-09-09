import fs from "node:fs";
import path from "node:path";
import { ethers, network } from "hardhat";

/**
 * ENV facultatifs :
 * MULTICALL_OUT : chemin du JSON de sortie (mapping { [chainId]: { address, blockCreated } })
 *                 défaut: packages/config/src/multicall3.json
 * PRINT_WAGMI_SNIPPET="1" : affiche un snippet viem/wagmi prêt à coller
 */
const ROOT = path.resolve(__dirname, "../../..");
const DEFAULT_OUT = path.join(ROOT, "packages/config/src/multicall3.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const outPath = process.env.MULTICALL_OUT || DEFAULT_OUT;

  console.log("— Deploy Multicall3 —");
  console.log("Network:", network.name, `(#${chainId})`);
  console.log("Deployer:", deployer.address);

  const F = await ethers.getContractFactory("Multicall3");
  const mc = await F.deploy();
  await mc.waitForDeployment(); // ethers v6
  const address = await mc.getAddress();

  const depTx = mc.deploymentTransaction();
  const receipt = await depTx?.wait();
  const blockCreated = receipt?.blockNumber ?? (await ethers.provider.getBlockNumber());

  console.log("Multicall3 deployed at:", address);
  console.log("Block created:", blockCreated);

  // Sauvegarde JSON
  ensureDir(path.dirname(outPath));
  const current = readJsonSafe(outPath);
  const next = { ...(current || {}), [chainId]: { address, blockCreated } };
  fs.writeFileSync(outPath, JSON.stringify(next, null, 2));
  console.log("Saved:", relativeFromRoot(outPath));

  // Snippet viem/wagmi
  if (process.env.PRINT_WAGMI_SNIPPET === "1") {
    console.log("\n— viem/wagmi chain snippet —\n");
    console.log(`contracts: {
  multicall3: {
    address: "${address}",
    blockCreated: ${blockCreated}
  }
}`);
  }

  console.log("\nDone ✅");
}

function readJsonSafe(p: string): any | null {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ensureDir(d: string) {
  fs.mkdirSync(d, { recursive: true });
}

function relativeFromRoot(p: string) {
  return path.relative(ROOT, p) || p;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
