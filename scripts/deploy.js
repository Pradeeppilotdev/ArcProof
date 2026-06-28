const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ARC_TESTNET_RPC = process.env.ARC_TESTNET_RPC || "https://rpc.testnet.arc.network";
const ARC_CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID || "5042002");
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

function loadArtifact(name) {
  const json = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`))
  );
  return { abi: json.abi, bytecode: json.bytecode };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying ArcProof contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Network: Arc Testnet");
  console.log("─".repeat(50));

  // ── 0. Groth16Verifier ─────────────────────────────────────────────────────
  console.log("\n[0/4] Deploying Groth16Verifier...");
  const { abi: g16Abi, bytecode: g16Bytecode } = loadArtifact("Groth16Verifier");
  const g16Factory = new ethers.ContractFactory(g16Abi, g16Bytecode, deployer);
  const groth16Verifier = await g16Factory.deploy();
  await groth16Verifier.waitForDeployment();
  const groth16Addr = await groth16Verifier.getAddress();
  console.log("✓ Groth16Verifier deployed:", groth16Addr);

  // ── 1. ProofVerifier ───────────────────────────────────────────────────────
  console.log("\n[1/4] Deploying ProofVerifier...");
  const { abi: pvAbi, bytecode: pvBytecode } = loadArtifact("ProofVerifier");
  const pvFactory = new ethers.ContractFactory(pvAbi, pvBytecode, deployer);
  const proofVerifier = await pvFactory.deploy(groth16Addr);
  await proofVerifier.waitForDeployment();
  const proofVerifierAddr = await proofVerifier.getAddress();
  console.log("✓ ProofVerifier deployed:", proofVerifierAddr);

  // ── 2. SettlementGate ─────────────────────────────────────────────────────
  console.log("\n[2/4] Deploying SettlementGate...");
  const deployerNonce = await provider.getTransactionCount(deployer.address);
  const predictedRegistryAddr = ethers.getCreateAddress({
    from: deployer.address,
    nonce: deployerNonce + 1,
  });
  console.log("  Predicted WorkRegistry address:", predictedRegistryAddr);

  const { abi: sgAbi, bytecode: sgBytecode } = loadArtifact("SettlementGate");
  const sgFactory = new ethers.ContractFactory(sgAbi, sgBytecode, deployer);
  const settlementGate = await sgFactory.deploy(predictedRegistryAddr, proofVerifierAddr);
  await settlementGate.waitForDeployment();
  const settlementGateAddr = await settlementGate.getAddress();
  console.log("✓ SettlementGate deployed:", settlementGateAddr);

  // ── 3. WorkRegistry ───────────────────────────────────────────────────────
  console.log("\n[3/4] Deploying WorkRegistry...");
  const { abi: wrAbi, bytecode: wrBytecode } = loadArtifact("WorkRegistry");
  const wrFactory = new ethers.ContractFactory(wrAbi, wrBytecode, deployer);
  const workRegistry = await wrFactory.deploy(USDC_ADDRESS, settlementGateAddr);
  await workRegistry.waitForDeployment();
  const workRegistryAddr = await workRegistry.getAddress();
  console.log("✓ WorkRegistry deployed:", workRegistryAddr);

  if (workRegistryAddr.toLowerCase() !== predictedRegistryAddr.toLowerCase()) {
    console.warn("⚠ WorkRegistry address mismatch!");
    console.warn("  Expected:", predictedRegistryAddr);
    console.warn("  Got:     ", workRegistryAddr);
  } else {
    console.log("✓ Address prediction matched");
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("Deployment complete:");
  console.log(`  Groth16Verifier: ${groth16Addr}`);
  console.log(`  ProofVerifier:   ${proofVerifierAddr}`);
  console.log(`  SettlementGate:  ${settlementGateAddr}`);
  console.log(`  WorkRegistry:    ${workRegistryAddr}`);

  const addresses = {
    network: "arc-testnet",
    chainId: ARC_CHAIN_ID,
    usdc: USDC_ADDRESS,
    groth16Verifier: groth16Addr,
    proofVerifier: proofVerifierAddr,
    settlementGate: settlementGateAddr,
    workRegistry: workRegistryAddr,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(
    path.join(__dirname, "../frontend/src/lib/contracts.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n✓ Contract addresses written to frontend/src/contracts.json");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
