require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    // Arc Testnet — update RPC + chainId from https://docs.arc.io/arc/references/connect-to-arc
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC || "https://rpc.arc.io/testnet",
      chainId: parseInt(process.env.ARC_CHAIN_ID || "1337"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    // Local hardhat for fast iteration
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
