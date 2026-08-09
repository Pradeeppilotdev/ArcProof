# ArcZK

> Lock USDC behind a secret answer. Prove knowledge via ZK to claim it.
> <img width="1920" height="944" alt="image" src="https://github.com/user-attachments/assets/bc7dca02-4272-454f-bbef-287363d4cc55" />


**Live demo:** `https://arczk.vercel.app`  
**Arc Testnet Explorer:** https://testnet.arcscan.app

---

## How It Works

```
Poster locks USDC + Poseidon hash of a secret → Claimer guesses the secret →
Claimer generates Groth16 proof → On-chain verification → USDC released
```

No judges, no disputes. If you know the secret answer, you can prove it and take the reward.

---

## Architecture

```
WorkRegistry.sol          — Task lifecycle (Open → Proving → Settled), stores salt + description on-chain
ProofVerifier.sol         — Delegates to Groth16Verifier via external call
SettlementGate.sol        — Orchestrates verify + release (only entry point)
Groth16Verifier.sol       — Auto-generated from snarkjs, BN128 pairing

circuits/
  task_completion.circom  — Poseidon hash pre-image proof (324 constraints, 3 public inputs)
```

### Proof Pipeline

```
claimTask() → sets agent, status → Proving
generate-proof.js / browser snarkjs → Groth16 fullProve()
submitProof() → SettlementGate → ProofVerifier → Groth16Verifier → settleTask()
```

---

## Contracts (Arc Testnet)

| Contract | Address |
|---|---|
| Groth16Verifier | `0xF8cEDF4A354c4797c0210720da7cA60Fa8cBf315` |
| ProofVerifier | `0xF873FF8D85c889207FE96C7B795FD1cD49B4cA55` |
| SettlementGate | `0xE268164C879594169F4DE08DDD778dECA7EdD22D` |
| WorkRegistry | `0x68e1f8c12bEa096372B169a9e4f5fafb4BeD1c9A` |

These are the addresses `frontend/src/lib/contracts.json` actually points at (source of truth for what's live at `arczk.vercel.app` — this table previously listed a stale, earlier deployment that the frontend didn't use).

Verified 2026-07-22: on-chain `eth_getCode` for all four contracts matches the compiled `artifacts/` bytecode exactly (the only byte-level diffs are the immutable constructor addresses baked into `ProofVerifier` and `SettlementGate`, which correctly point at the contracts above, plus the trailing metadata hash). `SettlementGate` and `WorkRegistry` were redeployed on this date after a Slither pass (see Static analysis below) — `Groth16Verifier` and `ProofVerifier` are untouched and reused from the prior deployment.

Adding Agentic AI for autonomous agent actions soon..
---

## Setup

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
#   ARC_TESTNET_RPC=https://rpc.testnet.arc.network
```

---

## Testing

```bash
npm test
```

31 Hardhat tests across `WorkRegistry`, `ProofVerifier`, and `SettlementGate` — access control (only `SettlementGate` can call `settleTask`, only the claiming agent can submit a proof), the deadline/slash/refund lifecycle, double-settlement protection, constructor zero-address guards, and proof-input validation (`InputMismatch`, `ScalarOutOfRange`, `InvalidProof`). `contracts/mocks/` holds a mintable USDC stand-in and a configurable fake Groth16 verifier so these run without generating real ZK proofs; `Groth16Verifier.sol` itself is exercised for real via the on-chain bytecode check noted above.

### Static analysis

Ran [Slither](https://github.com/crytic/slither) (0.11.5) over `contracts/`. Findings acted on:
- Added zero-address checks to `WorkRegistry`'s constructor (`usdc`, `settlementGate`) — an unguarded zero address there would have permanently bricked the contract.
- Reordered `WorkRegistry.postTask` to write task state before the `transferFrom` call, so it follows checks-effects-interactions even if the escrowed token ever gained transfer hooks.

Remaining findings are either informational (timestamp-comparison and naming-convention notes) or scoped to `Groth16Verifier.sol`, the unmodified snarkjs-generated verifier (inline assembly, non-mixedCase constants) — expected in generated pairing-check code and left as-is.

---

## Build & Deploy

```bash
npm run compile        # Compile contracts
npm run deploy:testnet # Deploy to Arc Testnet
cd frontend && npm run dev  # http://localhost:5173
```

### ZK Circuit

```bash
mkdir -p ptau
curl -o ptau/powersOfTau28_hez_final_12.ptau \
  https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
npm run circuit:compile && npm run circuit:setup
npm run circuit:contribute && npm run circuit:export
```

---

## Tech Stack

- **Frontend:** Vite + React + wagmi + viem + Reown (AppKit)
- **ZK:** snarkjs + circomlibjs (browser Groth16 proving)
- **Chain:** Arc Testnet (chain 5042002)
- **Styling:** Tailwind v4, sunset glassmorphism

---

## Roadmap

- [x] Deploy to Arc Testnet
- [x] Replace mock ProofVerifier with real Groth16Verifier
- [x] On-chain salt storage for proving agents
- [x] On-chain challenge descriptions
- [ ] Agent reputation score (on-chain track record of verified completions)
- [ ] Multi-agent task coordination
- [ ] Farcaster Frame for task posting
