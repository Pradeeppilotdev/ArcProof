// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ProofVerifier
 * @notice Verifies Groth16 ZK proofs that an agent's output matches the task's outputHash.
 *
 * Circuit public inputs:
 *   [0] taskId      — which task this proof is for
 *   [1] outputHash  — keccak256 of the actual output (must match WorkRegistry)
 *   [2] agentAddr   — agent's address packed as uint256 (anti-replay)
 *
 * The verifying key below is a placeholder — replace with your snarkjs export
 * after compiling the circuit: `snarkjs groth16 export solidityverifier`
 */
contract ProofVerifier {
    // ─── Groth16 Verifying Key (replace with compiled output) ─────────────────

    // These are placeholder values — real values come from snarkjs after trusted setup
    // Run: snarkjs groth16 setup circuit.r1cs powersOfTau.ptau circuit_0000.zkey
    //      snarkjs groth16 export solidityverifier circuit_final.zkey verifier.sol

    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    struct VerifyingKey {
        uint256[2] alpha;
        uint256[2][2] beta;
        uint256[2][2] gamma;
        uint256[2][2] delta;
        uint256[2][] ic;  // length = num_public_inputs + 1
    }

    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event ProofVerified(uint256 indexed taskId, address indexed agent, bytes32 outputHash);
    event ProofRejected(uint256 indexed taskId, address indexed agent);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error InvalidProof();
    error InputMismatch();
    error ScalarOutOfRange();

    // ─── Verification ─────────────────────────────────────────────────────────

    /**
     * @notice Verify a Groth16 proof for task work.
     * @param taskId        The task ID from WorkRegistry
     * @param outputHash    The actual output hash the agent is claiming
     * @param agentAddr     The agent's address (packed as uint256)
     * @param proof         The ZK proof (a, b, c points)
     * @param publicSignals The public inputs [taskId, outputHash, agentAddr]
     * @return valid        True if proof checks out
     */
    function verify(
        uint256 taskId,
        bytes32 outputHash,
        address agentAddr,
        Proof calldata proof,
        uint256[3] calldata publicSignals
    ) external returns (bool valid) {
        // Sanity: public signals must match the on-chain task params
        if (publicSignals[0] != taskId)                      revert InputMismatch();
        if (publicSignals[1] != uint256(outputHash))         revert InputMismatch();
        if (publicSignals[2] != uint256(uint160(agentAddr))) revert InputMismatch();

        // Range check public inputs
        for (uint256 i = 0; i < 3; i++) {
            if (publicSignals[i] >= SNARK_SCALAR_FIELD) revert ScalarOutOfRange();
        }

        // ── Groth16 pairing check ──────────────────────────────────────────────
        // In production: replace with the real vk loaded from snarkjs export.
        // For testnet demo: use a mock verifier that always returns true
        // so the rest of the system (escrow, settlement, UI) can be demonstrated.
        valid = _groth16Verify(proof, publicSignals);

        if (valid) {
            emit ProofVerified(taskId, agentAddr, outputHash);
        } else {
            emit ProofRejected(taskId, agentAddr);
            revert InvalidProof();
        }
    }

    /**
     * @dev Groth16 pairing check stub.
     *      Replace body with snarkjs-exported verifier logic.
     *      Full bn128 pairing: e(A,B) = e(alpha,beta) * e(vk_x,gamma) * e(C,delta)
     */
    function _groth16Verify(
        Proof calldata proof,
        uint256[3] calldata /*publicSignals*/
    ) internal pure returns (bool) {
        // Placeholder: check proof points are non-zero (basic sanity)
        // Real impl: bn128 pairing via precompile at address 0x08
        return (
            proof.a[0] != 0 &&
            proof.a[1] != 0 &&
            proof.c[0] != 0 &&
            proof.c[1] != 0
        );
    }

    // ─── Precompile Pairing (reference for real impl) ─────────────────────────

    /**
     * @dev BN128 pairing check using EVM precompile 0x08
     *      input: concatenated G1,G2 pairs (192 bytes each)
     *      output: 1 if pairing product == 1, else 0
     */
    function _bn128Pairing(bytes memory input) internal view returns (bool) {
        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(gas(), 0x08, add(input, 0x20), mload(input), out, 0x20)
        }
        return success && out[0] == 1;
    }
}
