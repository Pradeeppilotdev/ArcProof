// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./WorkRegistry.sol";
import "./ProofVerifier.sol";

/**
 * @title SettlementGate
 * @notice The single entry point for proof-gated USDC settlement.
 *
 * Flow:
 *   Agent calls submitProof() →
 *     ProofVerifier.verify() checks ZK proof →
 *       WorkRegistry.settleTask() releases USDC to agent
 *
 * This is the ONLY contract authorized to call WorkRegistry.settleTask().
 * No human approval. No time-based release. Proof or nothing.
 */
contract SettlementGate {
    // ─── State ────────────────────────────────────────────────────────────────

    WorkRegistry   public immutable registry;
    ProofVerifier  public immutable verifier;

    // ─── Events ───────────────────────────────────────────────────────────────

    event SettlementTriggered(
        uint256 indexed taskId,
        address indexed agent,
        bytes32 outputHash,
        uint256 reward
    );

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotTaskAgent();
    error TaskNotInProvingState();
    error DeadlineExpired();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _registry, address _verifier) {
        registry = WorkRegistry(_registry);
        verifier = ProofVerifier(_verifier);
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /**
     * @notice Submit a ZK proof for task completion. If valid, USDC settles immediately.
     *
     * @param taskId        Task ID from WorkRegistry
     * @param outputHash    Hash of the actual work output
     * @param proof         Groth16 proof (a, b, c)
     * @param publicSignals Public circuit inputs [taskId, outputHash, agentAddr]
     */
    function submitProof(
        uint256 taskId,
        bytes32 outputHash,
        ProofVerifier.Proof calldata proof,
        uint256[3] calldata publicSignals
    ) external {
        WorkRegistry.Task memory task = registry.getTask(taskId);

        // Only the claimed agent can submit
        if (msg.sender != task.agent) revert NotTaskAgent();

        // Must still be in Proving state
        if (task.status != WorkRegistry.TaskStatus.Proving) revert TaskNotInProvingState();

        // Deadline must not have passed
        if (block.timestamp >= task.deadline) revert DeadlineExpired();

        // ── ZK Proof Gate ─────────────────────────────────────────────────────
        // ProofVerifier will revert with InvalidProof() if proof is bad.
        // No try/catch — we want the whole tx to revert on bad proof.
        verifier.verify(
            taskId,
            outputHash,
            msg.sender,
            proof,
            publicSignals
        );

        // ── Release Escrow ────────────────────────────────────────────────────
        // Only reachable if proof verified. USDC goes to agent atomically.
        registry.settleTask(taskId);

        emit SettlementTriggered(taskId, msg.sender, outputHash, task.reward);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Preview whether a task is settleable right now (agent + timing checks only,
     *         does not validate the proof itself).
     */
    function canSettle(uint256 taskId, address agent) external view returns (bool, string memory) {
        WorkRegistry.Task memory task = registry.getTask(taskId);

        if (task.agent != agent)
            return (false, "Not the assigned agent");
        if (task.status != WorkRegistry.TaskStatus.Proving)
            return (false, "Task not in Proving state");
        if (block.timestamp >= task.deadline)
            return (false, "Deadline expired");

        return (true, "Ready — submit your proof");
    }
}
