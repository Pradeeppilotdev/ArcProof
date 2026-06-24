import { buildPoseidon } from "circomlibjs";

let poseidonCache = null;

async function getPoseidon() {
  if (!poseidonCache) poseidonCache = await buildPoseidon();
  return poseidonCache;
}

export function chunkOutput(raw, len = 4, chunkSize = 28) {
  const buf = new TextEncoder().encode(raw);
  const out = [];
  for (let i = 0; i < len; i++) {
    const hex = Array.from(buf.slice(i * chunkSize, (i + 1) * chunkSize))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    out.push(BigInt("0x" + (hex || "00")));
  }
  return out;
}

export async function computeOutputHash(rawOutput, saltBig) {
  const poseidon = await getPoseidon();
  const fields = chunkOutput(rawOutput);
  const hashBytes = poseidon([...fields, saltBig]);
  return BigInt(poseidon.F.toString(hashBytes));
}
