import { ethers } from "hardhat";

const FACTORY = process.env.FACTORY!;
const ROUTER = process.env.ROUTER!;
const TOKEN_A = process.env.TOKEN_A!;
const TOKEN_B = process.env.TOKEN_B!;
const USER = process.env.USER!; // ton address 0x...

const FactoryABI = [
  "function getPair(address,address) view returns (address)"
];
const PairABI = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];
const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function symbol() view returns (string)"
];
const RouterABI = [
  "function factory() view returns (address)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const factory = new ethers.Contract(FACTORY, FactoryABI, signer);
  const router = new ethers.Contract(ROUTER, RouterABI, signer);
  const tokenA = new ethers.Contract(TOKEN_A, ERC20, signer);
  const tokenB = new ethers.Contract(TOKEN_B, ERC20, signer);

  const rf = await router.factory();
  console.log("Router.factory =", rf, rf.toLowerCase() === FACTORY.toLowerCase() ? "OK" : "MISMATCH!");

  const [symA, symB] = await Promise.all([tokenA.symbol(), tokenB.symbol()]);
  console.log("Tokens:", symA, TOKEN_A, "|", symB, TOKEN_B);

  const [balA, balB, allowA, allowB] = await Promise.all([
    tokenA.balanceOf(USER),
    tokenB.balanceOf(USER),
    tokenA.allowance(USER, ROUTER),
    tokenB.allowance(USER, ROUTER),
  ]);
  console.log("User balances:", balA.toString(), balB.toString());
  console.log("User allowances:", allowA.toString(), allowB.toString());

  const pair = await factory.getPair(TOKEN_A, TOKEN_B);
  console.log("Pair:", pair);

  if (pair !== ethers.ZeroAddress) {
    const p = new ethers.Contract(pair, PairABI, signer);
    const [t0, t1] = await Promise.all([p.token0(), p.token1()]);
    const [r0, r1] = await p.getReserves();
    console.log("Pair tokens:", t0, t1);
    console.log("Reserves:", r0.toString(), r1.toString());
  } else {
    console.log("Pair does not exist yet.");
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
