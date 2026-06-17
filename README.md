# ArcProof

> ZK-verified task completion payments on Arc — USDC only settles when work is cryptographically proven.

**Live demo:** `https://arcproof.vercel.app` *(deploy after testnet)*  
**Arc Testnet Explorer:** *(add contract links after deploy)*

---

## The Problem

Every agent payment system built on Arc today releases USDC based on **trust** — human approval, time locks, or policy rules. There's no cryptographic proof that an agent actually completed the work correctly before funds settle.

## The Solution

ArcProof introduces a **ZK proof gate** at the settlement layer:

```
Client locks USDC → Agent does work → Agent generates ZK proof → 
ProofVerifier checks proof on-chain → USDC releases atomically
```

No human in the loop. No timers. Proof or nothing.

---

## Architecture

```
WorkRegistry.sol          — Task escrow + lifecycle (Open → Proving → Settled)
ProofVerifier.sol         — Groth16 ZK proof verification (BN128 pairing)
SettlementGate.sol        — Orchestrates verify + release (only entry point)

circuits/
  task_completion.circom  — Poseidon hash pre-image proof circuit

scripts/
  deploy.js               — Arc testnet deployment
  generate-proof.js       — Off-chain proof generation (snarkjs)
```

### Settlement Flow

```
agent calls SettlementGate.submitProof(taskId, outputHash, proof, publicSignals)
  ↓
ProofVerifier.verify() — checks Groth16 pairing, public input binding
  ↓ (reverts with InvalidProof if bad)
WorkRegistry.settleTask() — transfers USDC from escrow to agent
  ↓
TaskSettled event emitted on Arc
```

### Circuit: What Gets Proven

The Circom circuit proves (without revealing the output):

- Agent knows the **pre-image** of `outputHash` (Poseidon hash)
- The proof is bound to a specific **taskId** (no replay across tasks)
- The proof is bound to a specific **agentAddr** (no proof stealing)

Public inputs (verified on-chain): `[taskId, outputHash, agentAddr]`  
Private inputs (never leave agent): `[rawOutput[4], salt]`

---

## Setup

### Prerequisites

```bash
node >= 18
npm >= 9
circom 2.1.6      # cargo install circom
snarkjs           # npm i -g snarkjs
```

### Install

```bash
git clone https://github.com/Pradeeppilotdev/arcproof
cd arcproof
npm install
cd frontend && npm install && cd ..
```

### Configure

```bash
cp .env.example .env
# Fill in:
#   PRIVATE_KEY=your_testnet_wallet_private_key
#   ARC_TESTNET_RPC=https://rpc.arc.io/testnet   (from docs.arc.io)
#   ARC_CHAIN_ID=<chain id from docs>
```

---

## Build & Deploy

### 1. Compile contracts

```bash
npm run compile
```

### 2. Compile the ZK circuit

```bash
# Download trusted setup (powers of tau)
mkdir ptau
curl -o ptau/powersOfTau28_hez_final_12.ptau \
  https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau

# Compile circuit → wasm + r1cs
npm run circuit:compile

# Groth16 setup
npm run circuit:setup

# Contribute randomness (required for Groth16)
npm run circuit:contribute

# Export Solidity verifier
npm run circuit:export
# → generates contracts/Groth16Verifier.sol
# Replace ProofVerifier._groth16Verify() with the exported logic
```

### 3. Deploy to Arc Testnet

```bash
npm run deploy:testnet
# Outputs contract addresses → writes to frontend/src/contracts.json
```

### 4. Run frontend

```bash
npm run dev
# → http://localhost:5173
```

---

## Generate a Proof (CLI)

```bash
AGENT_ADDRESS=0xYourAddress \
  node scripts/generate-proof.js 0 "task output text here" "random_salt_123"

# Outputs: proof_task_0.json
# Contains: proof.a, proof.b, proof.c, publicSignals
# Use these to call SettlementGate.submitProof() directly or via the UI
```

---

## Why Arc?

- **USDC as gas** — no ETH needed, pure stablecoin economy
- **Agent lifecycle events** — Arc tracks agent activity at protocol level
- **Built-in CCTP** — crosschain USDC for multi-chain agent coordination
- **Sub-cent fees** — ZK proof verification is affordable at Arc's fee level
- **EVM compatible** — BN128 precompile (0x08) works natively for Groth16

---

## Roadmap

- [ ] Deploy to Arc Testnet + live demo
- [ ] Replace mock ProofVerifier with snarkjs-exported Groth16Verifier
- [ ] Agent reputation score (on-chain track record of verified completions)
- [ ] Multi-agent task coordination (agent A subcontracts to agent B, ZK-settled)
- [ ] Farcaster Frame for task posting + proof status

---