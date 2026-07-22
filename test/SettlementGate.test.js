const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployAll,
  postOpenTask,
  samplePublicSignals,
  sampleProof,
  fieldSafeHash,
  REWARD,
} = require("./fixtures");

describe("SettlementGate", function () {
  let ctx;

  beforeEach(async function () {
    ctx = await deployAll();
  });

  async function claimAndProve(overrides = {}) {
    const { workRegistry, agent } = ctx;
    const { taskId, outputHash } = await postOpenTask(ctx, overrides);
    await workRegistry.connect(agent).claimTask(taskId);
    return { taskId, outputHash };
  }

  it("settles and pays the agent when the proof verifies", async function () {
    const { settlementGate, workRegistry, usdc, agent } = ctx;
    const { taskId, outputHash } = await claimAndProve();

    const before = await usdc.balanceOf(agent.address);
    await settlementGate
      .connect(agent)
      .submitProof(taskId, outputHash, sampleProof(), samplePublicSignals(taskId, outputHash, agent.address));
    const after = await usdc.balanceOf(agent.address);

    expect(after - before).to.equal(REWARD);
    expect((await workRegistry.getTask(taskId)).status).to.equal(2n); // Settled
  });

  it("reverts with InvalidProof when the verifier rejects", async function () {
    const { settlementGate, groth16, agent } = ctx;
    const { taskId, outputHash } = await claimAndProve();
    await groth16.setResult(false);

    await expect(
      settlementGate
        .connect(agent)
        .submitProof(taskId, outputHash, sampleProof(), samplePublicSignals(taskId, outputHash, agent.address))
    ).to.be.revertedWithCustomError(await ctx.proofVerifier, "InvalidProof");
  });

  it("reverts if someone other than the claiming agent submits", async function () {
    const { settlementGate, other, agent } = ctx;
    const { taskId, outputHash } = await claimAndProve();

    await expect(
      settlementGate
        .connect(other)
        .submitProof(taskId, outputHash, sampleProof(), samplePublicSignals(taskId, outputHash, agent.address))
    ).to.be.revertedWithCustomError(settlementGate, "NotTaskAgent");
  });

  it("reverts if the task was never claimed (agent is still the zero address)", async function () {
    const { settlementGate, client, agent } = ctx;
    const { taskId, outputHash } = await postOpenTask(ctx);

    await expect(
      settlementGate
        .connect(client)
        .submitProof(taskId, outputHash, sampleProof(), samplePublicSignals(taskId, outputHash, agent.address))
    ).to.be.revertedWithCustomError(settlementGate, "NotTaskAgent");
  });

  it("reverts once the deadline has passed", async function () {
    const { settlementGate, agent } = ctx;
    const now = Math.floor(await time.latest());
    const { taskId, outputHash } = await claimAndProve({ deadline: now + 100 });
    await time.increase(200);

    await expect(
      settlementGate
        .connect(agent)
        .submitProof(taskId, outputHash, sampleProof(), samplePublicSignals(taskId, outputHash, agent.address))
    ).to.be.revertedWithCustomError(settlementGate, "DeadlineExpired");
  });

  it("ignores the caller-supplied outputHash and checks against the on-chain committed one", async function () {
    // publicSignals[1] must match the on-chain task.outputHash regardless of the
    // (unused) outputHash calldata param — ProofVerifier reads task.outputHash itself.
    const { settlementGate, agent } = ctx;
    const { taskId, outputHash } = await claimAndProve();
    const wrongOutputHash = fieldSafeHash("wrong-output");

    const badSignals = samplePublicSignals(taskId, wrongOutputHash, agent.address);

    await expect(
      settlementGate.connect(agent).submitProof(taskId, outputHash, sampleProof(), badSignals)
    ).to.be.revertedWithCustomError(await ctx.proofVerifier, "InputMismatch");
  });

  it("reverts on double settlement (task already Settled, same agent)", async function () {
    const { settlementGate, agent } = ctx;
    const { taskId, outputHash } = await claimAndProve();
    const signals = samplePublicSignals(taskId, outputHash, agent.address);

    await settlementGate.connect(agent).submitProof(taskId, outputHash, sampleProof(), signals);

    await expect(
      settlementGate.connect(agent).submitProof(taskId, outputHash, sampleProof(), signals)
    ).to.be.revertedWithCustomError(settlementGate, "TaskNotInProvingState");
  });

  describe("canSettle", function () {
    it("reports ready when the task is claimable and unexpired", async function () {
      const { settlementGate, agent } = ctx;
      const { taskId } = await claimAndProve();

      const [ready, reason] = await settlementGate.canSettle(taskId, agent.address);
      expect(ready).to.equal(true);
      expect(reason).to.equal("Ready - submit your proof");
    });

    it("reports not ready for the wrong agent", async function () {
      const { settlementGate, other } = ctx;
      const { taskId } = await claimAndProve();

      const [ready, reason] = await settlementGate.canSettle(taskId, other.address);
      expect(ready).to.equal(false);
      expect(reason).to.equal("Not the assigned agent");
    });
  });
});
