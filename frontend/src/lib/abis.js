import contracts from "../contracts.json";

export const WR = contracts.workRegistry;
export const SG = contracts.settlementGate;
export const USDC = contracts.usdc;

export const wrAbi = [
  { inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }], name: "claimTask", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }], name: "getTask", outputs: [{ components: [{ internalType: "address", name: "client", type: "address" }, { internalType: "address", name: "agent", type: "address" }, { internalType: "uint256", name: "reward", type: "uint256" }, { internalType: "bytes32", name: "outputHash", type: "bytes32" }, { internalType: "uint64", name: "deadline", type: "uint64" }, { internalType: "uint8", name: "status", type: "uint8" }], internalType: "struct WorkRegistry.Task", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "nextTaskId", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "reward", type: "uint256" }, { internalType: "bytes32", name: "outputHash", type: "bytes32" }, { internalType: "uint64", name: "deadline", type: "uint64" }], name: "postTask", outputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
];

export const sgAbi = [
  { inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }, { internalType: "bytes32", name: "outputHash", type: "bytes32" }, { components: [{ internalType: "uint256[2]", name: "a", type: "uint256[2]" }, { internalType: "uint256[2][2]", name: "b", type: "uint256[2][2]" }, { internalType: "uint256[2]", name: "c", type: "uint256[2]" }], internalType: "struct ProofVerifier.Proof", name: "proof", type: "tuple" }, { internalType: "uint256[3]", name: "publicSignals", type: "uint256[3]" }], name: "submitProof", outputs: [], stateMutability: "nonpayable", type: "function" },
];

export const erc20Abi = [
  { inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
];

export const STATUS_MAP = ["Open", "Proving", "Settled", "Slashed"];
