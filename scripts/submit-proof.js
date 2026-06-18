const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const { workRegistry, proofVerifier, settlementGate, usdc } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../frontend/src/contracts.json"))
  );

  const proof = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../proof_task_0.json"))
  );

  const WorkRegistryABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/WorkRegistry.sol/WorkRegistry.json"))
  ).abi;
  const SettlementGateABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/SettlementGate.sol/SettlementGate.json"))
  ).abi;
  const IERC20ABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/interfaces/IERC20.sol/IERC20.json"))
  ).abi;

  const registry = new ethers.Contract(workRegistry, WorkRegistryABI, wallet);
  const gate = new ethers.Contract(settlementGate, SettlementGateABI, wallet);
  const usdcContract = new ethers.Contract(usdc, IERC20ABI, wallet);

  const reward = ethers.parseUnits("10", 6);
  const outputHash = ethers.zeroPadValue(ethers.toBeHex(BigInt(proof.outputHash)), 32);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  console.log("ArcProof — On-chain Submission");
  console.log("─".repeat(50));
  console.log("Deployer:", wallet.address);
  console.log("USDC:", usdc);
  console.log("");

  // ── Step 1: Check USDC balance ──────────────────────────────────────────────
  const balance = await usdcContract.balanceOf(wallet.address);
  console.log(`USDC balance: ${ethers.formatUnits(balance, 6)}`);

  if (balance < reward) {
    console.error("Insufficient USDC. Get testnet USDC from the Arc faucet.");
    process.exit(1);
  }

  // ── Step 2: Approve USDC ────────────────────────────────────────────────────
  console.log("\n[1/4] Approving USDC for WorkRegistry...");
  const allowance = await usdcContract.allowance(wallet.address, workRegistry);
  if (allowance < reward) {
    const txApprove = await usdcContract.approve(workRegistry, reward);
    console.log("  Approve tx:", txApprove.hash);
    await txApprove.wait();
    console.log("  ✓ Approved");
  } else {
    console.log("  ✓ Allowance sufficient");
  }

  // ── Step 3: Post Task ───────────────────────────────────────────────────────
  console.log("\n[2/4] Posting task...");
  const txPost = await registry.postTask(reward, outputHash, deadline);
  console.log("  Post tx:", txPost.hash);
  const receiptPost = await txPost.wait();
  const taskId = 0;
  console.log(`  ✓ Task #${taskId} posted (outputHash: ${outputHash.slice(0, 20)}...)`);

  // ── Step 4: Claim Task ──────────────────────────────────────────────────────
  console.log("\n[3/4] Claiming task...");
  const txClaim = await registry.claimTask(taskId);
  console.log("  Claim tx:", txClaim.hash);
  await txClaim.wait();
  console.log("  ✓ Task claimed");

  // ── Step 5: Submit Proof ────────────────────────────────────────────────────
  console.log("\n[4/4] Submitting ZK proof...");
  const proofA = proof.proof.a.map((v) => BigInt(v));
  const proofB = proof.proof.b.map((row) => row.map((v) => BigInt(v)));
  const proofC = proof.proof.c.map((v) => BigInt(v));
  const publicSignals = proof.publicSignals.map((v) => BigInt(v));

  const txProof = await gate.submitProof(
    taskId,
    outputHash,
    [proofA, proofB, proofC],
    publicSignals
  );
  console.log("  Submit proof tx:", txProof.hash);
  await txProof.wait();

  // ── Done ────────────────────────────────────────────────────────────────────
  const task = await registry.getTask(taskId);
  console.log(`\n  ✓ Task #${taskId} settled! Status: ${["Open", "Proving", "Settled", "Slashed"][task.status]}`);
  console.log(`  Agent received ${ethers.formatUnits(task.reward, 6)} USDC`);

  console.log("\n" + "─".repeat(50));
  console.log("Full settlement pipeline verified ✓");
}

main().catch((err) => {
  console.error("Submission failed:", err.message);
  process.exit(1);
});
