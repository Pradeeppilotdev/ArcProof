const hre = require("hardhat");
const { readFileSync } = require("fs");

async function main() {
  const artifacts = JSON.parse(readFileSync("/tmp/proof_artifacts.json", "utf-8"));
  const { proof, publicSignals } = artifacts;

  const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
  const b = [[BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])], [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]];
  const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
  const pub = publicSignals.map(v => BigInt(v));

  console.log("Public signals:", pub.map(v => v.toString()));

  const [signer] = await hre.ethers.getSigners();
  const verifierAddr = "0xCD04C8A9544DD86640e7001085dAA00B2c4D9a07";
  const abi = [
    "function verifyProof(uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[3] memory _pubSignals) public view returns (bool)"
  ];
  const verifier = new hre.ethers.Contract(verifierAddr, abi, signer);

  try {
    const result = await verifier.verifyProof(a, b, c, pub);
    console.log("On-chain verification:", result ? "PASSED" : "FAILED");
  } catch (err) {
    console.log("On-chain verification ERROR:", err.message?.slice(0, 200));
  }
}

main().catch(console.error);
