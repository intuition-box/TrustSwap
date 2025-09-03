import fs from "node:fs";

// ⚠️ En ESM, pas de __dirname. Utilise new URL(..., import.meta.url)
const tokens = JSON.parse(
  fs.readFileSync(new URL("./tokens.json", import.meta.url), "utf-8")
);

const tokenlist = {
  name: "TrustSwap Curation",
  timestamp: new Date().toISOString(),
  version: { major: 0, minor: 1, patch: 0 },
  tokens
};

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(
  "dist/trustswap.tokenlist.json",
  JSON.stringify(tokenlist, null, 2)
);

console.log(`✅ Built dist/trustswap.tokenlist.json with ${tokens.length} tokens`);
