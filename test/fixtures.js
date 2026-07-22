const { ethers } = require("hardhat");

/**
 * Deploys the full stack (MockUSDC, MockGroth16Verifier, ProofVerifier,
 * SettlementGate, WorkRegistry) wired together the same way scripts/deploy.js
 * wires the real contracts on Arc Testnet — SettlementGate is deployed with a
 * predicted WorkRegistry address (CREATE nonce math) since the two reference
 * each other's addresses.
 */
async function deployAll() {
  const [deployer, client, agent, other] = await ethers.getSigners();

  const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();

  const groth16 = await (await ethers.getContractFactory("MockGroth16Verifier")).deploy();

  const proofVerifier = await (
    await ethers.getContractFactory("ProofVerifier")
  ).deploy(await groth16.getAddress());

  const deployerAddr = await deployer.getAddress();
  const nonce = await ethers.provider.getTransactionCount(deployerAddr);
  const predictedRegistryAddr = ethers.getCreateAddress({ from: deployerAddr, nonce: nonce + 1 });

  const settlementGate = await (
    await ethers.getContractFactory("SettlementGate")
  ).deploy(predictedRegistryAddr, await proofVerifier.getAddress());

  const workRegistry = await (
    await ethers.getContractFactory("WorkRegistry")
  ).deploy(await usdc.getAddress(), await settlementGate.getAddress());

  if ((await workRegistry.getAddress()).toLowerCase() !== predictedRegistryAddr.toLowerCase()) {
    throw new Error("CREATE address prediction drifted — deployer nonce order changed");
  }

  return { usdc, groth16, proofVerifier, settlementGate, workRegistry, deployer, client, agent, other };
}

const REWARD = 1_000_000n; // 1 USDC (6 decimals)
const BN254_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// keccak256 spans the full 256 bits, so ~50% of raw hashes land >= the BN254
// scalar field and would trip ProofVerifier's ScalarOutOfRange check. The real
// circuit uses Poseidon (which is field-safe by construction); for keccak-based
// test fixtures we reduce mod r to keep values usable as a circuit public signal.
function fieldSafeHash(seed) {
  const h = BigInt(ethers.keccak256(ethers.toUtf8Bytes(seed)));
  return ethers.zeroPadValue(ethers.toBeHex(h % BN254_SCALAR_FIELD), 32);
}

async function postOpenTask({ workRegistry, usdc, client }, overrides = {}) {
  await usdc.mint(client.address, REWARD);
  await usdc.connect(client).approve(await workRegistry.getAddress(), REWARD);

  const now = Math.floor(Date.now() / 1000);
  const deadline = overrides.deadline ?? now + 3600;
  const outputHash = overrides.outputHash ?? fieldSafeHash("expected-output");
  const salt = overrides.salt ?? 12345n;
  const description = overrides.description ?? "test task";

  const tx = await workRegistry.connect(client).postTask(REWARD, outputHash, deadline, salt, description);
  await tx.wait();
  return { taskId: 0n, outputHash, deadline, salt };
}

function samplePublicSignals(taskId, outputHash, agentAddress) {
  return [taskId, BigInt(outputHash), BigInt(agentAddress)];
}

function sampleProof() {
  return {
    a: [1n, 2n],
    b: [[1n, 2n], [3n, 4n]],
    c: [5n, 6n],
  };
}

module.exports = {
  deployAll,
  postOpenTask,
  samplePublicSignals,
  sampleProof,
  fieldSafeHash,
  REWARD,
  BN254_SCALAR_FIELD,
};
