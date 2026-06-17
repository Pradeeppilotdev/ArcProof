// scripts/deploy.js
// Deploy ArcProof contracts to Arc Testnet
// Run: node scripts/deploy.js

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ─── Arc Testnet Config ───────────────────────────────────────────────────────
// https://docs.arc.io/arc/references/connect-to-arc
const ARC_TESTNET_RPC = process.env.ARC_TESTNET_RPC || "https://rpc.arc.io/testnet";
const ARC_CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID || "5042002");

// Arc testnet USDC address — update from:
// https://docs.arc.io/arc/references/contract-addresses
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// ─── ABIs (compiled from contracts) ──────────────────────────────────────────
// Run: npx hardhat compile  →  artifacts/contracts/...

async function main() {
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying ArcProof contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Network: Arc Testnet");
  console.log("─".repeat(50));

  // ── 1. Deploy ProofVerifier ─────────────────────────────────────────────────
  console.log("\n[1/3] Deploying ProofVerifier...");
  const ProofVerifierABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ProofVerifier.sol/ProofVerifier.json"))
  ).abi;
  const ProofVerifierBytecode = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ProofVerifier.sol/ProofVerifier.json"))
  ).bytecode;

  const ProofVerifierFactory = new ethers.ContractFactory(ProofVerifierABI, ProofVerifierBytecode, deployer);
  const proofVerifier = await ProofVerifierFactory.deploy();
  await proofVerifier.waitForDeployment();
  const proofVerifierAddr = await proofVerifier.getAddress();
  console.log("✓ ProofVerifier deployed:", proofVerifierAddr);

  // ── 2. Deploy SettlementGate (needs ProofVerifier + WorkRegistry addresses) ─
  // We deploy a temporary placeholder for WorkRegistry first,
  // then deploy SettlementGate, then deploy the real WorkRegistry.
  // Alternatively: deploy WorkRegistry with a 2-step init.
  // Simpler approach: deploy WorkRegistry with settlementGate = deployer first,
  // then deploy SettlementGate, then update (if we add an owner pattern).

  // For testnet: use CREATE2 or just deploy in order with a known address.
  // Here we use the straightforward sequential approach:

  // ── 2a. Deploy SettlementGate stub to get its address ──────────────────────
  console.log("\n[2/3] Deploying SettlementGate...");

  // Temporary: deploy with zero address for registry, update after
  // In production use a factory pattern or deterministic deployment
  const SettlementGateABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/SettlementGate.sol/SettlementGate.json"))
  ).abi;
  const SettlementGateBytecode = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/SettlementGate.sol/SettlementGate.json"))
  ).bytecode;

  // Predict WorkRegistry address (nonce + 1 from now)
  const deployerNonce = await provider.getTransactionCount(deployer.address);
  const predictedRegistryAddr = ethers.getCreateAddress({
    from: deployer.address,
    nonce: deployerNonce + 1, // WorkRegistry deploys after SettlementGate
  });
  console.log("  Predicted WorkRegistry address:", predictedRegistryAddr);

  const SettlementGateFactory = new ethers.ContractFactory(SettlementGateABI, SettlementGateBytecode, deployer);
  const settlementGate = await SettlementGateFactory.deploy(predictedRegistryAddr, proofVerifierAddr);
  await settlementGate.waitForDeployment();
  const settlementGateAddr = await settlementGate.getAddress();
  console.log("✓ SettlementGate deployed:", settlementGateAddr);

  // ── 3. Deploy WorkRegistry ──────────────────────────────────────────────────
  console.log("\n[3/3] Deploying WorkRegistry...");
  const WorkRegistryABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/WorkRegistry.sol/WorkRegistry.json"))
  ).abi;
  const WorkRegistryBytecode = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/WorkRegistry.sol/WorkRegistry.json"))
  ).bytecode;

  const WorkRegistryFactory = new ethers.ContractFactory(WorkRegistryABI, WorkRegistryBytecode, deployer);
  const workRegistry = await WorkRegistryFactory.deploy(USDC_ADDRESS, settlementGateAddr);
  await workRegistry.waitForDeployment();
  const workRegistryAddr = await workRegistry.getAddress();
  console.log("✓ WorkRegistry deployed:", workRegistryAddr);

  // Verify address prediction was correct
  if (workRegistryAddr.toLowerCase() !== predictedRegistryAddr.toLowerCase()) {
    console.warn("⚠ WorkRegistry address mismatch! SettlementGate may be pointing to wrong address.");
    console.warn("  Expected:", predictedRegistryAddr);
    console.warn("  Got:     ", workRegistryAddr);
  } else {
    console.log("✓ Address prediction matched correctly");
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("Deployment complete. Update frontend/src/App.jsx:");
  console.log("");
  console.log(`  WorkRegistry:   ${workRegistryAddr}`);
  console.log(`  ProofVerifier:  ${proofVerifierAddr}`);
  console.log(`  SettlementGate: ${settlementGateAddr}`);
  console.log("");
  console.log("Verify on Arc explorer:");
  console.log(`  https://explorer.arc.io/address/${workRegistryAddr}`);
  console.log(`  https://explorer.arc.io/address/${proofVerifierAddr}`);
  console.log(`  https://explorer.arc.io/address/${settlementGateAddr}`);

  // Write addresses to file for frontend consumption
  const addresses = {
    network: "arc-testnet",
    chainId: ARC_CHAIN_ID,
    usdc: USDC_ADDRESS,
    workRegistry: workRegistryAddr,
    proofVerifier: proofVerifierAddr,
    settlementGate: settlementGateAddr,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(
    path.join(__dirname, "../frontend/src/contracts.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n✓ Contract addresses written to frontend/src/contracts.json");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
