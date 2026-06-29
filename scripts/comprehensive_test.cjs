const { groth16 } = require("snarkjs");
const { readFileSync, writeFileSync } = require("fs");
const hre = require("hardhat");

async function main() {
  // 1. Load circuit artifacts
  const wasmBuf = readFileSync("frontend/public/circuits/task_completion.wasm");
  const zkeyBuf = readFileSync("frontend/public/circuits/task_completion_final.zkey");
  
  // 2. Generate proof with known inputs
  const input = {
    rawOutput: ["345232271731", "0", "0", "0"],
    salt: "23450803646439627281031111450845287153059314797733957615238247202543",
    taskId: "0",
    outputHash: "12825664370457269612510466292625418941673343125039522539221063718704411188280",
    agentAddr: "1441416616225016464436167344136982754343859557053",
  };
  
  console.log("Generating proof...");
  const { proof, publicSignals } = await groth16.fullProve(
    input,
    new Uint8Array(wasmBuf),
    new Uint8Array(zkeyBuf)
  );
  console.log("Public signals:", publicSignals);
  
  // 3. Verify locally with snarkjs
  const vkey = JSON.parse(readFileSync("/tmp/vkey.json", "utf-8"));
  const snarkjsOk = await groth16.verify(vkey, publicSignals, proof);
  console.log("snarkjs verify:", snarkjsOk ? "OK" : "FAIL");
  
  if (!snarkjsOk) throw new Error("snarkjs verification failed");
  
  // 4. Deploy the locally compiled Groth16Verifier
  const [signer] = await hre.ethers.getSigners();
  const artifact = JSON.parse(
    readFileSync("artifacts/contracts/Groth16Verifier.sol/Groth16Verifier.json", "utf-8")
  );
  const factory = new hre.ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const verifier = await factory.deploy();
  await verifier.waitForDeployment();
  console.log("Verifier deployed at:", await verifier.getAddress());
  
  // 5. Call the contract
  const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
  const b = [[BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])], [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]];
  const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
  const pub = publicSignals.map(v => BigInt(v));
  
  console.log("Calling contract verifyProof...");
  const contractOk = await verifier.verifyProof(a, b, c, pub);
  console.log("Contract verify:", contractOk ? "OK" : "FAIL");
  
  if (contractOk) {
    console.log("\n*** SUCCESS: verified both snarkjs and contract ***");
  } else {
    console.log("\n*** FAILURE: snarkjs OK but contract rejected ***");
    
    // Debug: check the G1 precompiles work
    const testVerifier = await hre.ethers.deployContract("Groth16Verifier");
    // ... 
  }
}

main().catch(console.error);
