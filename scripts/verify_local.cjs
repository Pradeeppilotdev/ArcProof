const hre = require("hardhat");
const { readFileSync } = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  // Deploy Groth16Verifier locally
  const artifact = JSON.parse(
    readFileSync("artifacts/contracts/Groth16Verifier.sol/Groth16Verifier.json", "utf-8")
  );
  const factory = new hre.ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const verifier = await factory.deploy();
  await verifier.waitForDeployment();
  const addr = await verifier.getAddress();
  console.log("Groth16Verifier deployed at:", addr);

  // Load proof artifacts
  const proofData = JSON.parse(readFileSync("/tmp/proof_artifacts.json", "utf-8"));
  const { proof, publicSignals } = proofData;

  const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
  const b = [[BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])], [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]];
  const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
  const pub = publicSignals.map(v => BigInt(v));

  console.log("Calling verifyProof...");
  const result = await verifier.verifyProof(a, b, c, pub);
  console.log("Local verification:", result ? "PASSED" : "FAILED");
}

main().catch(console.error);
