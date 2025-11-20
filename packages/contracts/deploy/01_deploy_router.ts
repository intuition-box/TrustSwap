import { ethers } from "hardhat";

async function main() {
  const FACTORY = process.env.UNIV2_FACTORY!;
  const WNATIVE = process.env.WNATIVE!;

  console.log("Deploying UniswapV2Router02...");
  console.log("  factory:", FACTORY);
  console.log("  WNATIVE:", WNATIVE);

  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(FACTORY, WNATIVE);

  await router.waitForDeployment();

  console.log("UniswapV2Router02 deployed at:", await router.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
