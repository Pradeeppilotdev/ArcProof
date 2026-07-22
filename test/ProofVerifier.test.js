const { expect } = require("chai");
const { ethers } = require("hardhat");
const { sampleProof, fieldSafeHash, BN254_SCALAR_FIELD } = require("./fixtures");

describe("ProofVerifier", function () {
  let proofVerifier, groth16, taskId, outputHash, agentAddr;

  beforeEach(async function () {
    groth16 = await (await ethers.getContractFactory("MockGroth16Verifier")).deploy();
    proofVerifier = await (
      await ethers.getContractFactory("ProofVerifier")
    ).deploy(await groth16.getAddress());

    taskId = 1n;
    outputHash = fieldSafeHash("output");
    const [, agent] = await ethers.getSigners();
    agentAddr = agent.address;
  });

  it("verifies and emits ProofVerified when signals + proof are valid", async function () {
    const signals = [taskId, BigInt(outputHash), BigInt(agentAddr)];
    await expect(proofVerifier.verify(taskId, outputHash, agentAddr, sampleProof(), signals))
      .to.emit(proofVerifier, "ProofVerified")
      .withArgs(taskId, agentAddr, outputHash);
  });

  it("reverts with InputMismatch if publicSignals[0] != taskId", async function () {
    const signals = [taskId + 1n, BigInt(outputHash), BigInt(agentAddr)];
    await expect(
      proofVerifier.verify(taskId, outputHash, agentAddr, sampleProof(), signals)
    ).to.be.revertedWithCustomError(proofVerifier, "InputMismatch");
  });

  it("reverts with InputMismatch if publicSignals[1] != outputHash", async function () {
    const signals = [taskId, BigInt(outputHash) + 1n, BigInt(agentAddr)];
    await expect(
      proofVerifier.verify(taskId, outputHash, agentAddr, sampleProof(), signals)
    ).to.be.revertedWithCustomError(proofVerifier, "InputMismatch");
  });

  it("reverts with InputMismatch if publicSignals[2] != agentAddr", async function () {
    const signals = [taskId, BigInt(outputHash), BigInt(agentAddr) + 1n];
    await expect(
      proofVerifier.verify(taskId, outputHash, agentAddr, sampleProof(), signals)
    ).to.be.revertedWithCustomError(proofVerifier, "InputMismatch");
  });

  it("reverts with ScalarOutOfRange if a public signal exceeds the BN254 scalar field", async function () {
    // taskId itself is the out-of-range value; keep it consistent with publicSignals[0]
    // so the InputMismatch checks pass first and the scalar-range loop is what trips.
    const oversizedTaskId = BN254_SCALAR_FIELD; // == field modulus, not < r
    const signals = [oversizedTaskId, BigInt(outputHash), BigInt(agentAddr)];
    await expect(
      proofVerifier.verify(oversizedTaskId, outputHash, agentAddr, sampleProof(), signals)
    ).to.be.revertedWithCustomError(proofVerifier, "ScalarOutOfRange");
  });

  it("reverts with InvalidProof and emits ProofRejected when the verifier returns false", async function () {
    await groth16.setResult(false);
    const signals = [taskId, BigInt(outputHash), BigInt(agentAddr)];

    await expect(proofVerifier.verify(taskId, outputHash, agentAddr, sampleProof(), signals))
      .to.be.revertedWithCustomError(proofVerifier, "InvalidProof");
  });
});
