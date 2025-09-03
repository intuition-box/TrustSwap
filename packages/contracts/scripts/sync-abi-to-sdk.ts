// packages/contracts/scripts/sync-abi-to-sdk.ts
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

// ✅ On scanne TOUTE la racine des artifacts (inclut @uniswap ET contracts/)
const ARTIFACTS_ROOT = path.join(ROOT, "packages/contracts/artifacts");
const SDK_ABI_DIR    = path.join(ROOT, "packages/sdk/src/abi");

// On veut écrire ces fichiers ABI (noms "standards") dans le SDK.
// Pour chacun, on essaie plusieurs "candidats" (nom exact du contrat dans l'artifact).
const TARGETS: Array<{ out: string; candidates: string[] }> = [
  // Uniswap v2
  { out: "UniswapV2Factory.json",  candidates: ["UniswapV2Factory"] },
  { out: "UniswapV2Pair.json",     candidates: ["UniswapV2Pair"] },
  { out: "UniswapV2Router02.json", candidates: ["UniswapV2Router02"] },

  // Tes contrats
  { out: "StakingRewards.json",         candidates: ["StakingRewards"] },
  { out: "StakingRewardsFactory.json",  candidates: ["StakingRewardsFactoryV2", "StakingRewardsFactory"] },
  { out: "TSWP.json",                   candidates: ["TSWP"] },
  { out: "WTTRUST.json",                candidates: ["WTTRUST", "WETH9"] },

  // Optionnel
  { out: "IERC20.json",                 candidates: ["IERC20"] },
];

function ensureDir(d: string) {
  fs.mkdirSync(d, { recursive: true });
}

function findArtifact(contractName: string): string | null {
  // Cherche "<NomContrat>.json" n'importe où sous artifacts/
  const stack = [ARTIFACTS_ROOT];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile() && ent.name === `${contractName}.json`) return p;
    }
  }
  return null;
}

function main() {
  ensureDir(SDK_ABI_DIR);
  let missing = 0;

  for (const t of TARGETS) {
    // essaie les candidats dans l'ordre jusqu'à trouver un artifact
    const src = t.candidates.map(findArtifact).find(Boolean);
    if (!src) {
      console.warn(`⚠️  Introuvable: ${t.out} (candidats: ${t.candidates.join(", ")}) — compile d'abord ou vérifie les noms`);
      missing++;
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(src, "utf8"));
    if (!artifact.abi) {
      console.warn(`⚠️  Pas de "abi" dans ${src}`);
      missing++;
      continue;
    }

    const outPath = path.join(SDK_ABI_DIR, t.out);
    fs.writeFileSync(outPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`✅ Écrit ${path.relative(ROOT, outPath)} (depuis ${path.relative(ROOT, src)})`);
  }

  if (missing > 0) {
    console.log("ℹ️  Certains ABI manquent — OK si non utilisés pour l’instant.");
  }
}

main();
