import { ethers } from "hardhat";
async function main() {
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const feeToSetter = process.env.FEE_TO!;
  const f = await Factory.deploy(feeToSetter);
  await f.waitForDeployment();
  console.log("Factory:", await f.getAddress());
}
main().catch(e=>{console.error(e);process.exit(1)});
