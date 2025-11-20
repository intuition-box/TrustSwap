import { ethers } from "hardhat";

async function main() {
  // Use first signer as temporary feeToSetter (admin for protocol fees)
  const [deployer] = await ethers.getSigners();
  const feeToSetter = await deployer.getAddress();

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deploying UniswapV2Factory...");
  console.log("  chainId:", chainId);
  console.log("  deployer / feeToSetter:", feeToSetter);

  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(feeToSetter);
  await factory.waitForDeployment();

  const addr = await factory.getAddress();
  console.log("UniswapV2Factory deployed at:", addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
