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
| Groth16Verifier | `0x8E7a48ab862D35098AC20E048A350311C739ac27` |
| ProofVerifier | `0x6E17Dcb36a9225746C6E04acd6dCfA43Ac6f2F97` |
| SettlementGate | `0x1E0583fF65171D29D6DB0b43Da4A09bb5CA0aF99` |
| WorkRegistry | `0x3C4D771007a6f1a55e21303D996B9E02141A61e7` |

Verified 2026-07-22: on-chain `eth_getCode` for `Groth16Verifier` and `ProofVerifier` matches the compiled `artifacts/` bytecode exactly (the only byte-level diff on `ProofVerifier` is the immutable `groth16Verifier` constructor address, which correctly points at the deployed `Groth16Verifier` above). The real Groth16 verifier is live, not the mock.

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

29 Hardhat tests across `WorkRegistry`, `ProofVerifier`, and `SettlementGate` — access control (only `SettlementGate` can call `settleTask`, only the claiming agent can submit a proof), the deadline/slash/refund lifecycle, double-settlement protection, and proof-input validation (`InputMismatch`, `ScalarOutOfRange`, `InvalidProof`). `contracts/mocks/` holds a mintable USDC stand-in and a configurable fake Groth16 verifier so these run without generating real ZK proofs; `Groth16Verifier.sol` itself is exercised for real via the on-chain bytecode check noted above.

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
