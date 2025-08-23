import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CHAIN_ID = Number(process.env.CHAIN_ID || 0);

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.6.6",  settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.5.16", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.4.18", settings: { optimizer: { enabled: true, runs: 200 } } }
    ]
  },
  networks: {
    intuition: {
      url: RPC_URL,
      chainId: CHAIN_ID || undefined,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
  },
};
export default config;
