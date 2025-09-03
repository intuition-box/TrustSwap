import { config as dotenv } from "dotenv";
dotenv();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.6.6",  settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.5.16", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.4.19", settings: { optimizer: { enabled: true, runs: 200 } } } // WETH9 canonical
    ]

  },
  networks: {
    // ⚠️ remplis .env avant d'utiliser ce réseau
    intuition: {
      url: process.env.INTUITION_RPC_URL || "",
      chainId: Number(process.env.CHAIN_ID || 0),
      accounts: (process.env.PRIVATE_KEY || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
};

export default config;
