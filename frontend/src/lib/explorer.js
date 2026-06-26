const CHAIN_ID = 5042002;
const EXPLORERS = {
  5042002: "https://explorer.testnet.arc.network",
};

export function txUrl(hash) {
  const base = EXPLORERS[CHAIN_ID];
  if (!base || !hash) return null;
  return `${base}/tx/${hash}`;
}
