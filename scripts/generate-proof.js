// scripts/generate-proof.js
// Generate a Groth16 ZK proof for task completion
// Run: node scripts/generate-proof.js <taskId> <rawOutput> <salt>
//
// Example:
//   node scripts/generate-proof.js 0 "Hello World" "12345"

const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const ethers = require("ethers");
const fs = require("fs");
const path = require("path");

async function generateProof(taskId, rawOutput, salt, agentAddress) {
  console.log("ArcProof — Generating ZK Proof");
  console.log("─".repeat(40));
  console.log("Task ID:      ", taskId);
  console.log("Agent:        ", agentAddress);
  console.log("Salt:         ", salt);
  console.log("");

  // ── Step 1: Build Poseidon hash of output ─────────────────────────────────
  console.log("[1/4] Computing Poseidon hash of output...");
  const poseidon = await buildPoseidon();

  // Convert rawOutput string to 4 field elements
  // (pad/truncate to fit circuit's outputLen = 4)
  const outputBytes = Buffer.from(rawOutput, "utf8");
  const chunkSize = 28; // safe chunk for BN128 field
  const outputFields = [];
  for (let i = 0; i < 4; i++) {
    const chunk = outputBytes.slice(i * chunkSize, (i + 1) * chunkSize);
    outputFields.push(BigInt("0x" + (chunk.length ? chunk.toString("hex") : "00")));
  }

  // Convert salt to BigInt — if it's not a pure number, hash it
  let saltBig;
  try {
    saltBig = BigInt(salt);
  } catch {
    saltBig = BigInt(ethers.keccak256(Buffer.from(salt, "utf8")));
  }
  const poseidonHash = poseidon.F.toString(poseidon([...outputFields, saltBig]));
  console.log("  Output fields:", outputFields.map(f => f.toString(16).slice(0, 8) + "..."));
  console.log("  Poseidon hash:", poseidonHash.slice(0, 20) + "...");

  // ── Step 2: Build circuit witness ─────────────────────────────────────────
  console.log("\n[2/4] Building witness...");
  const agentAddrBig = BigInt(agentAddress);

  const input = {
    // Private
    rawOutput: outputFields.map(f => f.toString()),
    salt: saltBig.toString(),
    // Public
    taskId: taskId.toString(),
    outputHash: poseidonHash,
    agentAddr: agentAddrBig.toString(),
  };

  // Paths to compiled circuit artifacts
  // Run: cd circuits && circom task_completion.circom --r1cs --wasm --sym
  const wasmPath = path.join(__dirname, "../circuits/task_completion_js/task_completion.wasm");
  const zkeyPath = path.join(__dirname, "../circuits/task_completion_final.zkey");

  if (!fs.existsSync(wasmPath)) {
    console.warn("  ⚠ Circuit WASM not found. Run circuit compilation first:");
    console.warn("    cd circuits");
    console.warn("    circom task_completion.circom --r1cs --wasm --sym");
    console.warn("    snarkjs groth16 setup task_completion.r1cs powersOfTau.ptau task_completion_0000.zkey");
    console.warn("    snarkjs zkey contribute task_completion_0000.zkey task_completion_final.zkey");
    console.warn("\n  Generating MOCK proof for demo purposes...");
    return generateMockProof(taskId, poseidonHash, agentAddress);
  }

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
  console.log("  Witness built ✓");

  // ── Step 3: Format proof for Solidity ─────────────────────────────────────
  console.log("\n[3/4] Formatting proof for on-chain submission...");
  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  console.log("  Calldata ready ✓");

  // ── Step 4: Output ─────────────────────────────────────────────────────────
  console.log("\n[4/4] Proof complete.\n");

  const result = {
    taskId,
    outputHash: poseidonHash,
    agentAddress,
    proof: {
      a: proof.pi_a.slice(0, 2),
      b: [proof.pi_b[0], proof.pi_b[1]],
      c: proof.pi_c.slice(0, 2),
    },
    publicSignals,
    solidityCalldata: calldata,
  };

  console.log("─".repeat(40));
  console.log("Submit to SettlementGate.submitProof():");
  console.log("  taskId:      ", taskId);
  console.log("  outputHash:  ", poseidonHash.slice(0, 20) + "...");
  console.log("  proof.a:     ", result.proof.a);
  console.log("  publicSignals:", publicSignals);

  // Save proof to file
  const outPath = path.join(__dirname, `../proof_task_${taskId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n✓ Proof saved to proof_task_${taskId}.json`);

  return result;
}

function generateMockProof(taskId, outputHash, agentAddress) {
  // Mock proof for UI demo before circuit is compiled
  // Replace all values with real snarkjs output after setup
  return {
    taskId,
    outputHash,
    agentAddress,
    proof: {
      a: ["0x1234...mock", "0x5678...mock"],
      b: [["0xabcd...mock", "0xef01...mock"], ["0x2345...mock", "0x6789...mock"]],
      c: ["0xaaaa...mock", "0xbbbb...mock"],
    },
    publicSignals: [taskId.toString(), outputHash, BigInt(agentAddress).toString()],
    isMock: true,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const [, , taskId, rawOutput, salt] = process.argv;
const agentAddress = process.env.AGENT_ADDRESS || "0x0000000000000000000000000000000000000001";

if (!taskId || !rawOutput || !salt) {
  console.log("Usage: node generate-proof.js <taskId> <rawOutput> <salt>");
  console.log("  AGENT_ADDRESS env var required for anti-replay binding");
  process.exit(1);
}

generateProof(parseInt(taskId), rawOutput, salt, agentAddress)
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Proof generation failed:", err.message);
    process.exit(1);
  });
