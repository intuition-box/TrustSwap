import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "deployments/addresses.json");
if (!fs.existsSync(root)) throw new Error("deployments/addresses.json missing");

const sdkDir = path.resolve(process.cwd(), "../../sdk/src");
const abiDir = path.join(sdkDir, "abi");
const addrDir = path.join(sdkDir, "addresses");

fs.mkdirSync(abiDir, { recursive: true });
fs.mkdirSync(addrDir, { recursive: true });

const addresses = JSON.parse(fs.readFileSync(root, "utf8"));
fs.writeFileSync(path.join(addrDir, "addresses.json"), JSON.stringify(addresses, null, 2));

// copie les ABIs depuis artifacts
const artifacts = path.resolve(process.cwd(), "artifacts/contracts");
const list: Array<[string, string]> = [
  ["uniswapv2/core/UniswapV2Factory.sol/UniswapV2Factory", "UniswapV2Factory.json"],
  ["uniswapv2/periphery/UniswapV2Router02.sol/UniswapV2Router02", "UniswapV2Router02.json"],
  ["WETH9.sol/WETH9", "WETH9.json"]
];

for (const [sub, out] of list) {
  const src = path.join(artifacts, sub + ".json");
  if (!fs.existsSync(src)) {
    console.warn("ABI not found (skip):", src);
    continue;
  }
  fs.copyFileSync(src, path.join(abiDir, out));
}
console.log("Exported ABIs & addresses to packages/sdk/src");
