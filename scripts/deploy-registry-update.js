// One-off redeploy of SettlementGate + WorkRegistry after hardening fixes
// (zero-address constructor guard, checks-effects-interactions reorder in
// postTask). Groth16Verifier and ProofVerifier are untouched and reused as-is.
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ARC_TESTNET_RPC = process.env.ARC_TESTNET_RPC || "https://rpc.testnet.arc.network";
const ARC_CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID || "5042002");
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const EXISTING_GROTH16_VERIFIER = "0xF8cEDF4A354c4797c0210720da7cA60Fa8cBf315";
const EXISTING_PROOF_VERIFIER = "0xF873FF8D85c889207FE96C7B795FD1cD49B4cA55";

function loadArtifact(name) {
  const json = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`))
  );
  return { abi: json.abi, bytecode: json.bytecode };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Redeploying SettlementGate + WorkRegistry...");
  console.log("Deployer:", deployer.address);
  console.log("Reusing Groth16Verifier:", EXISTING_GROTH16_VERIFIER);
  console.log("Reusing ProofVerifier:  ", EXISTING_PROOF_VERIFIER);
  console.log("─".repeat(50));

  const deployerNonce = await provider.getTransactionCount(deployer.address);
  const predictedRegistryAddr = ethers.getCreateAddress({
    from: deployer.address,
    nonce: deployerNonce + 1,
  });
  console.log("  Predicted WorkRegistry address:", predictedRegistryAddr);

  console.log("\n[1/2] Deploying SettlementGate...");
  const { abi: sgAbi, bytecode: sgBytecode } = loadArtifact("SettlementGate");
  const sgFactory = new ethers.ContractFactory(sgAbi, sgBytecode, deployer);
  const settlementGate = await sgFactory.deploy(predictedRegistryAddr, EXISTING_PROOF_VERIFIER);
  await settlementGate.waitForDeployment();
  const settlementGateAddr = await settlementGate.getAddress();
  console.log("✓ SettlementGate deployed:", settlementGateAddr);

  console.log("\n[2/2] Deploying WorkRegistry...");
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
    process.exit(1);
  }
  console.log("✓ Address prediction matched");

  console.log("\n" + "─".repeat(50));
  console.log("Redeploy complete:");
  console.log(`  Groth16Verifier: ${EXISTING_GROTH16_VERIFIER} (unchanged)`);
  console.log(`  ProofVerifier:   ${EXISTING_PROOF_VERIFIER} (unchanged)`);
  console.log(`  SettlementGate:  ${settlementGateAddr}`);
  console.log(`  WorkRegistry:    ${workRegistryAddr}`);

  const addresses = {
    network: "arc-testnet",
    chainId: ARC_CHAIN_ID,
    usdc: USDC_ADDRESS,
    groth16Verifier: EXISTING_GROTH16_VERIFIER,
    proofVerifier: EXISTING_PROOF_VERIFIER,
    settlementGate: settlementGateAddr,
    workRegistry: workRegistryAddr,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(
    path.join(__dirname, "../frontend/src/lib/contracts.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n✓ Contract addresses written to frontend/src/lib/contracts.json");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
