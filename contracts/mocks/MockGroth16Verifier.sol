// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stand-in for the real snarkjs-generated Groth16Verifier, so ProofVerifier/
/// SettlementGate logic can be tested without generating real ZK proofs.
/// Matches the real verifier's `verifyProof` selector exactly.
contract MockGroth16Verifier {
    bool public result = true;

    function setResult(bool _result) external {
        result = _result;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[3] calldata
    ) external view returns (bool) {
        return result;
    }
}
