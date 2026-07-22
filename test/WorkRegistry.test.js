const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAll, postOpenTask, REWARD } = require("./fixtures");

describe("WorkRegistry", function () {
  let ctx;

  beforeEach(async function () {
    ctx = await deployAll();
  });

  describe("constructor", function () {
    it("reverts if usdc is the zero address", async function () {
      const factory = await ethers.getContractFactory("WorkRegistry");
      await expect(factory.deploy(ethers.ZeroAddress, ctx.other.address)).to.be.revertedWithCustomError(
        factory,
        "ZeroAddress"
      );
    });

    it("reverts if settlementGate is the zero address", async function () {
      const factory = await ethers.getContractFactory("WorkRegistry");
      await expect(
        factory.deploy(await ctx.usdc.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });

  describe("postTask", function () {
    it("escrows USDC and stores the task", async function () {
      const { workRegistry, usdc, client } = ctx;
      const { taskId, outputHash, deadline, salt } = await postOpenTask(ctx);

      expect(await usdc.balanceOf(await workRegistry.getAddress())).to.equal(REWARD);

      const task = await workRegistry.getTask(taskId);
      expect(task.client).to.equal(client.address);
      expect(task.agent).to.equal(ethers.ZeroAddress);
      expect(task.reward).to.equal(REWARD);
      expect(task.outputHash).to.equal(outputHash);
      expect(task.deadline).to.equal(deadline);
      expect(task.salt).to.equal(salt);
      expect(task.status).to.equal(0n); // Open
    });

    it("reverts on zero reward", async function () {
      const { workRegistry, client } = ctx;
      const now = Math.floor(Date.now() / 1000);
      await expect(
        workRegistry.connect(client).postTask(0, ethers.ZeroHash, now + 3600, 1, "x")
      ).to.be.revertedWithCustomError(workRegistry, "ZeroReward");
    });

    it("reverts if deadline is in the past", async function () {
      const { workRegistry, client } = ctx;
      const now = Math.floor(Date.now() / 1000);
      await expect(
        workRegistry.connect(client).postTask(REWARD, ethers.ZeroHash, now - 10, 1, "x")
      ).to.be.revertedWithCustomError(workRegistry, "DeadlinePassed");
    });
  });

  describe("claimTask", function () {
    it("lets an agent claim an open task", async function () {
      const { workRegistry, agent } = ctx;
      const { taskId } = await postOpenTask(ctx);

      await workRegistry.connect(agent).claimTask(taskId);

      const task = await workRegistry.getTask(taskId);
      expect(task.agent).to.equal(agent.address);
      expect(task.status).to.equal(1n); // Proving
    });

    it("reverts if the task is not Open", async function () {
      const { workRegistry, agent, other } = ctx;
      const { taskId } = await postOpenTask(ctx);
      await workRegistry.connect(agent).claimTask(taskId);

      await expect(workRegistry.connect(other).claimTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "TaskNotOpen"
      );
    });

    it("reverts if the deadline has already passed", async function () {
      const { workRegistry, agent } = ctx;
      const now = Math.floor(await time.latest());
      const { taskId } = await postOpenTask(ctx, { deadline: now + 100 });

      await time.increase(200);

      await expect(workRegistry.connect(agent).claimTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "DeadlinePassed"
      );
    });
  });

  describe("settleTask", function () {
    it("reverts when called by anyone other than settlementGate", async function () {
      const { workRegistry, agent, other } = ctx;
      const { taskId } = await postOpenTask(ctx);
      await workRegistry.connect(agent).claimTask(taskId);

      await expect(workRegistry.connect(other).settleTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "NotSettlementGate"
      );
    });
  });

  describe("slashTask", function () {
    it("refunds the client once the deadline passes on an unproven task", async function () {
      const { workRegistry, usdc, client, agent } = ctx;
      const now = Math.floor(await time.latest());
      const { taskId } = await postOpenTask(ctx, { deadline: now + 100 });
      await workRegistry.connect(agent).claimTask(taskId);

      await time.increase(200);

      const before = await usdc.balanceOf(client.address);
      await workRegistry.connect(agent).slashTask(taskId);
      const after = await usdc.balanceOf(client.address);

      expect(after - before).to.equal(REWARD);
      expect((await workRegistry.getTask(taskId)).status).to.equal(3n); // Slashed
    });

    it("reverts before the deadline", async function () {
      const { workRegistry, agent } = ctx;
      const { taskId } = await postOpenTask(ctx);
      await workRegistry.connect(agent).claimTask(taskId);

      await expect(workRegistry.connect(agent).slashTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "DeadlineNotPassed"
      );
    });

    it("reverts on a task that was never claimed (still Open)", async function () {
      const { workRegistry, agent } = ctx;
      const now = Math.floor(await time.latest());
      const { taskId } = await postOpenTask(ctx, { deadline: now + 100 });
      await time.increase(200);

      await expect(workRegistry.connect(agent).slashTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "TaskNotProving"
      );
    });
  });

  describe("refundExpiredTask", function () {
    it("lets the client reclaim an unclaimed task past its deadline", async function () {
      const { workRegistry, usdc, client } = ctx;
      const now = Math.floor(await time.latest());
      const { taskId } = await postOpenTask(ctx, { deadline: now + 100 });
      await time.increase(200);

      const before = await usdc.balanceOf(client.address);
      await workRegistry.connect(client).refundExpiredTask(taskId);
      const after = await usdc.balanceOf(client.address);

      expect(after - before).to.equal(REWARD);
    });

    it("reverts if called by someone other than the client", async function () {
      const { workRegistry, other } = ctx;
      const now = Math.floor(await time.latest());
      const { taskId } = await postOpenTask(ctx, { deadline: now + 100 });
      await time.increase(200);

      await expect(workRegistry.connect(other).refundExpiredTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "NotClient"
      );
    });

    it("reverts if the task was already claimed", async function () {
      const { workRegistry, client, agent } = ctx;
      const now = Math.floor(await time.latest());
      const { taskId } = await postOpenTask(ctx, { deadline: now + 100 });
      await workRegistry.connect(agent).claimTask(taskId);
      await time.increase(200);

      await expect(workRegistry.connect(client).refundExpiredTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "TaskNotOpen"
      );
    });

    it("reverts before the deadline", async function () {
      const { workRegistry, client } = ctx;
      const { taskId } = await postOpenTask(ctx);

      await expect(workRegistry.connect(client).refundExpiredTask(taskId)).to.be.revertedWithCustomError(
        workRegistry,
        "DeadlineNotPassed"
      );
    });
  });
});
