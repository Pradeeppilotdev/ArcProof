// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC20.sol";

/**
 * @title WorkRegistry
 * @notice Register tasks with USDC escrow. Only releases via ProofVerifier → SettlementGate.
 * @dev Deployed on Arc Testnet. USDC is the native gas + payment token.
 */
contract WorkRegistry {
    // ─── Types ───────────────────────────────────────────────────────────────

    enum TaskStatus { Open, Proving, Settled, Slashed }

    struct Task {
        address client;          // who posted the task + escrowed USDC
        address agent;           // who claimed the task
        uint256 reward;          // USDC amount in escrow (6 decimals)
        bytes32 outputHash;      // keccak256 of the expected output spec
        uint64  deadline;        // unix timestamp — miss it, stake is slashed
        TaskStatus status;
        uint256 salt;            // ZK proof salt — public so agent can construct witness
        string  description;     // plaintext challenge description — visible to everyone
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable usdc;
    address public immutable settlementGate;

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TaskPosted(uint256 indexed taskId, address indexed client, uint256 reward, bytes32 outputHash, uint64 deadline, uint256 salt, string description);
    event TaskClaimed(uint256 indexed taskId, address indexed agent);
    event TaskSettled(uint256 indexed taskId, address indexed agent, uint256 reward);
    event TaskSlashed(uint256 indexed taskId, address indexed client, uint256 refund);
    event TaskRefunded(uint256 indexed taskId, address indexed client, uint256 refund);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotAgent();
    error NotClient();
    error NotSettlementGate();
    error TaskNotOpen();
    error TaskNotProving();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error ZeroReward();
    error TransferFailed();
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdc, address _settlementGate) {
        if (_usdc == address(0) || _settlementGate == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        settlementGate = _settlementGate;
    }

    // ─── Client Actions ───────────────────────────────────────────────────────

    /**
     * @notice Post a task with USDC escrow.
     * @param reward        USDC amount (6 decimals)
     * @param outputHash    keccak256 of the expected output — agent must prove against this
     * @param deadline      Unix timestamp. Agent must prove before this or stake is slashed.
     * @param _salt         ZK salt — stored on-chain so the proving agent can read it
     */
    function postTask(
        uint256 reward,
        bytes32 outputHash,
        uint64 deadline,
        uint256 _salt,
        string calldata _description
    ) external returns (uint256 taskId) {
        if (reward == 0) revert ZeroReward();
        if (deadline <= block.timestamp) revert DeadlinePassed();

        taskId = nextTaskId++;
        tasks[taskId] = Task({
            client:      msg.sender,
            agent:       address(0),
            reward:      reward,
            outputHash:  outputHash,
            deadline:    deadline,
            status:      TaskStatus.Open,
            salt:        _salt,
            description: _description
        });

        // Effects before interaction: state is committed before the external call,
        // so even a malicious/hook-bearing token can't reenter into an inconsistent state.
        bool ok = usdc.transferFrom(msg.sender, address(this), reward);
        if (!ok) revert TransferFailed();

        emit TaskPosted(taskId, msg.sender, reward, outputHash, deadline, _salt, _description);
    }

    // ─── Agent Actions ────────────────────────────────────────────────────────

    /**
     * @notice Agent claims a task, locking it for proving.
     */
    function claimTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (t.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp >= t.deadline)  revert DeadlinePassed();

        t.agent  = msg.sender;
        t.status = TaskStatus.Proving;

        emit TaskClaimed(taskId, msg.sender);
    }

    // ─── Settlement Gate ──────────────────────────────────────────────────────

    /**
     * @notice Called exclusively by SettlementGate after ZK proof verified.
     *         Releases escrowed USDC to the agent.
     */
    function settleTask(uint256 taskId) external {
        if (msg.sender != settlementGate) revert NotSettlementGate();

        Task storage t = tasks[taskId];
        if (t.status != TaskStatus.Proving) revert TaskNotProving();

        t.status = TaskStatus.Settled;
        uint256 reward = t.reward;
        address agent  = t.agent;

        bool ok = usdc.transfer(agent, reward);
        if (!ok) revert TransferFailed();

        emit TaskSettled(taskId, agent, reward);
    }

    /**
     * @notice Anyone can slash an overdue task — refunds client, penalizes agent.
     *         In v2 this would slash the agent's staked USDC too.
     */
    function slashTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (t.status != TaskStatus.Proving) revert TaskNotProving();
        if (block.timestamp < t.deadline)   revert DeadlineNotPassed();

        t.status = TaskStatus.Slashed;
        uint256 refund = t.reward;
        address client = t.client;

        bool ok = usdc.transfer(client, refund);
        if (!ok) revert TransferFailed();

        emit TaskSlashed(taskId, client, refund);
    }

    /**
     * @notice Client refunds an expired task that was never claimed.
     *         Only the task poster can call this, and only on Open tasks past deadline.
     */
    function refundExpiredTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        if (t.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp < t.deadline) revert DeadlineNotPassed();

        t.status = TaskStatus.Slashed;
        uint256 refund = t.reward;

        bool ok = usdc.transfer(msg.sender, refund);
        if (!ok) revert TransferFailed();

        emit TaskRefunded(taskId, msg.sender, refund);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }
}
