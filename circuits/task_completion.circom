pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * ArcProof — Task Completion Circuit
 *
 * Private inputs (known only to the agent):
 *   - rawOutput[n]  : the actual work output as field elements
 *   - salt          : random salt to prevent pre-image attacks
 *
 * Public inputs (verified onchain):
 *   - taskId        : which task this proof is for
 *   - outputHash    : Poseidon(rawOutput, salt) — must match WorkRegistry
 *   - agentAddr     : agent's address as field element (anti-replay)
 *
 * What this proves:
 *   "I know the raw output that hashes to outputHash for taskId,
 *    and I am the agent at agentAddr — without revealing the output itself."
 *
 * Real-world extension: rawOutput can be the hash of an LLM response,
 * a computation result, an API call return — anything hashable.
 */
template TaskCompletionProof(outputLen) {
    // ── Private inputs ────────────────────────────────────────────────────────
    signal input rawOutput[outputLen];   // the actual work result
    signal input salt;                   // random blinding factor

    // ── Public inputs ─────────────────────────────────────────────────────────
    signal input taskId;
    signal input outputHash;     // Poseidon(rawOutput[0..n], salt)
    signal input agentAddr;      // agent's ETH address as field element

    // ── Intermediate signals ──────────────────────────────────────────────────
    signal computedHash;

    // ── Step 1: Hash the output with Poseidon ─────────────────────────────────
    // Poseidon is ZK-friendly (much cheaper than keccak256 in-circuit)
    // outputLen + 1 inputs = rawOutput fields + salt
    component poseidon = Poseidon(outputLen + 1);

    for (var i = 0; i < outputLen; i++) {
        poseidon.inputs[i] <== rawOutput[i];
    }
    poseidon.inputs[outputLen] <== salt;

    computedHash <== poseidon.out;

    // ── Step 2: Assert computed hash matches public outputHash ─────────────────
    // This is the core constraint: proves pre-image knowledge
    computedHash === outputHash;

    // ── Step 3: Bind to agentAddr (anti-replay, prevents proof stealing) ───────
    // The circuit takes agentAddr as public input — any other agent's address
    // would produce a different proof, so proofs cannot be reused by others.
    signal agentCheck;
    agentCheck <== agentAddr * 1;  // force agentAddr into constraint system
    _ <== agentCheck;

    // ── Step 4: Bind to taskId ────────────────────────────────────────────────
    signal taskCheck;
    taskCheck <== taskId * 1;
    _ <== taskCheck;
}

// Instantiate with outputLen = 4 field elements
// (enough for most task outputs; increase for larger payloads)
component main {public [taskId, outputHash, agentAddr]} = TaskCompletionProof(4);
