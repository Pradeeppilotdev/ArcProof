// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Groth16Verifier.sol";

contract ProofVerifier {
    Groth16Verifier public immutable groth16Verifier;

    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    event ProofVerified(uint256 indexed taskId, address indexed agent, bytes32 outputHash);
    event ProofRejected(uint256 indexed taskId, address indexed agent);

    error InvalidProof();
    error InputMismatch();
    error ScalarOutOfRange();

    constructor(address _groth16Verifier) {
        groth16Verifier = Groth16Verifier(_groth16Verifier);
    }

    function verify(
        uint256 taskId,
        bytes32 outputHash,
        address agentAddr,
        Proof calldata proof,
        uint256[3] calldata publicSignals
    ) external returns (bool valid) {
        if (publicSignals[0] != taskId)                      revert InputMismatch();
        if (publicSignals[1] != uint256(outputHash))         revert InputMismatch();
        if (publicSignals[2] != uint256(uint160(agentAddr))) revert InputMismatch();

        uint256 r = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        for (uint256 i = 0; i < 3; i++) {
            if (publicSignals[i] >= r) revert ScalarOutOfRange();
        }

        valid = groth16Verifier.verifyProof(proof.a, proof.b, proof.c, publicSignals);

        if (valid) {
            emit ProofVerified(taskId, agentAddr, outputHash);
        } else {
            emit ProofRejected(taskId, agentAddr);
            revert InvalidProof();
        }
    }
}
