import { readFileSync, writeFileSync } from "fs";
import { groth16 } from "snarkjs";

const secret = "Paris";
const salt = 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefn;

function chunkOutput(raw, len = 4, chunkSize = 28) {
  const buf = new TextEncoder().encode(raw);
  const out = [];
  for (let i = 0; i < len; i++) {
    const hex = Array.from(buf.slice(i * chunkSize, (i + 1) * chunkSize))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    out.push(BigInt("0x" + (hex || "00")));
  }
  return out;
}

import { buildPoseidon } from "circomlibjs";
const poseidon = await buildPoseidon();
const rawChunks = chunkOutput(secret);
const hashBytes = poseidon([...rawChunks, salt]);
const outputHashBigInt = BigInt(poseidon.F.toString(hashBytes));

const agentAddr = 0xFC7b5b43e27c5D47A34f9F7458551435Aa5892Bdn;

const input = {
  rawOutput: rawChunks.map(c => c.toString()),
  salt: salt.toString(),
  taskId: "0",
  outputHash: outputHashBigInt.toString(),
  agentAddr: BigInt(agentAddr).toString(),
};

const wasmBuf = readFileSync("frontend/public/circuits/task_completion.wasm");
const zkeyBuf = readFileSync("frontend/public/circuits/task_completion_final.zkey");

const { proof, publicSignals } = await groth16.fullProve(
  input,
  new Uint8Array(wasmBuf),
  new Uint8Array(zkeyBuf)
);

console.log("\n--- Proof artifacts (JSON) ---");
const out = { proof, publicSignals };
writeFileSync("/tmp/proof_artifacts.json", JSON.stringify(out, null, 2));
console.log("Written to /tmp/proof_artifacts.json");
console.log("Public signals:", publicSignals.join(", "));
