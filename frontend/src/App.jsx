import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useWalletClient, usePublicClient } from "wagmi";
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import { formatUnits, parseUnits } from "viem";
import contracts from "./contracts.json";

const WR = contracts.workRegistry;
const SG = contracts.settlementGate;
const USDC = contracts.usdc;

const wrAbi = [
  { inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }], name: "claimTask", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }], name: "getTask", outputs: [{ components: [{ internalType: "address", name: "client", type: "address" }, { internalType: "address", name: "agent", type: "address" }, { internalType: "uint256", name: "reward", type: "uint256" }, { internalType: "bytes32", name: "outputHash", type: "bytes32" }, { internalType: "uint64", name: "deadline", type: "uint64" }, { internalType: "uint8", name: "status", type: "uint8" }], internalType: "struct WorkRegistry.Task", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "nextTaskId", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "reward", type: "uint256" }, { internalType: "bytes32", name: "outputHash", type: "bytes32" }, { internalType: "uint64", name: "deadline", type: "uint64" }], name: "postTask", outputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
];
const sgAbi = [
  { inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }, { internalType: "bytes32", name: "outputHash", type: "bytes32" }, { components: [{ internalType: "uint256[2]", name: "a", type: "uint256[2]" }, { internalType: "uint256[2][2]", name: "b", type: "uint256[2][2]" }, { internalType: "uint256[2]", name: "c", type: "uint256[2]" }], internalType: "struct ProofVerifier.Proof", name: "proof", type: "tuple" }, { internalType: "uint256[3]", name: "publicSignals", type: "uint256[3]" }], name: "submitProof", outputs: [], stateMutability: "nonpayable", type: "function" },
];
const erc20Abi = [
  { inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
];

const STATUS_MAP = ["Open", "Proving", "Settled", "Slashed"];
let poseidonCache = null;
async function getPoseidon() {
  if (!poseidonCache) poseidonCache = await buildPoseidon();
  return poseidonCache;
}

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

async function computeOutputHash(rawOutput, saltBig) {
  const poseidon = await getPoseidon();
  const fields = chunkOutput(rawOutput);
  const hashBytes = poseidon([...fields, saltBig]);
  return BigInt(poseidon.F.toString(hashBytes));
}

function toBytes32(n) { return "0x" + n.toString(16).padStart(64, "0"); }
function shorten(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }
function formatUSDC(v) { return formatUnits(v, 6); }

const BG = "#0A0A0C";
const SURFACE = "#131316";
const BORDER = "#232328";
const BORDER_HOVER = "#33333a";
const TEXT = "#EDEDEF";
const MUTED = "#71717A";
const DIM = "#45454d";
const BLUE = "#5B8DEF";
const GREEN = "#3DD68C";
const AMBER = "#E8A33D";
const RED = "#E5534B";

const STATUS_STYLE = {
  Open: { color: BLUE, bg: "rgba(91,141,239,0.1)", border: "rgba(91,141,239,0.3)" },
  Proving: { color: AMBER, bg: "rgba(232,163,61,0.1)", border: "rgba(232,163,61,0.3)" },
  Settled: { color: GREEN, bg: "rgba(61,214,140,0.1)", border: "rgba(61,214,140,0.3)" },
  Slashed: { color: RED, bg: "rgba(229,83,75,0.1)", border: "rgba(229,83,75,0.3)" },
};

function useCountdown(deadline) {
  const [rem, setRem] = useState(Math.max(0, Number(deadline) * 1000 - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setRem(Math.max(0, Number(deadline) * 1000 - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [deadline]);
  const m = Math.floor(rem / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  return rem > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : "Expired";
}

function Btn({ children, tone = "default", ...props }) {
  const tones = {
    default: { bg: "transparent", border: BORDER, color: TEXT, hoverBg: SURFACE },
    primary: { bg: "rgba(91,141,239,0.12)", border: "rgba(91,141,239,0.35)", color: BLUE, hoverBg: "rgba(91,141,239,0.2)" },
    success: { bg: "rgba(61,214,140,0.12)", border: "rgba(61,214,140,0.35)", color: GREEN, hoverBg: "rgba(61,214,140,0.2)" },
    ghost: { bg: "transparent", border: "transparent", color: MUTED, hoverBg: SURFACE },
  };
  const t = tones[tone];
  const [hover, setHover] = useState(false);
  return (
    <button
      {...props}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? t.hoverBg : t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        borderRadius: 7,
        padding: "7px 14px",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.12s, border-color 0.12s",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Badge({ status }) {
  const s = STATUS_STYLE[status];
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 5, padding: "2px 8px", fontSize: 10.5, fontWeight: 600,
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>{status}</span>
  );
}

function Field({ children, mono }) {
  return <div style={{ fontSize: 12.5, color: TEXT, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{children}</div>;
}

function Label({ children }) {
  return <div style={{ fontSize: 10, color: DIM, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, fontWeight: 600 }}>{children}</div>;
}

function Pipeline({ stage }) {
  const steps = [
    { label: "Escrow", sub: "USDC locked" },
    { label: "Proving", sub: "ZK witness" },
    { label: "Verifying", sub: "On-chain pairing" },
    { label: "Settled", sub: "USDC released" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 0 8px" }}>
      {steps.map((s, i) => {
        const done = stage > i;
        const active = stage === i;
        const color = done ? GREEN : active ? BLUE : DIM;
        return (
          <div key={s.label} style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, width: 84 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                border: `1.5px solid ${color}`,
                background: done ? "rgba(61,214,140,0.12)" : active ? "rgba(91,141,239,0.12)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.4s ease",
              }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6.5" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: BLUE, animation: "arcproof-pulse 1.4s infinite" }} />
                ) : (
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: DIM }} />
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: done ? GREEN : active ? TEXT : MUTED, transition: "color 0.4s" }}>{s.label}</div>
                <div style={{ fontSize: 9.5, color: DIM, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 36, height: 1.5, marginTop: 17, background: stage > i ? GREEN : BORDER, transition: "background 0.6s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px" }}>
      <Label>{label}</Label>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || TEXT, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function TaskRow({ task, onProve, onClaim, proving, address, agentAddrEth }) {
  const countdown = useCountdown(task.deadline);
  const expired = Number(task.deadline) * 1000 < Date.now();
  const [hover, setHover] = useState(false);
  const isAgent = address && task.agent && address.toLowerCase() === task.agent.toLowerCase();
  const isClient = address && task.client && address.toLowerCase() === task.client.toLowerCase();
  const canClaim = task.status === "Open" && address && !expired;
  const canProve = task.status === "Proving" && isAgent && !expired;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${hover ? BORDER_HOVER : BORDER}`,
        borderRadius: 10,
        padding: "16px 18px",
        display: "grid",
        gridTemplateColumns: "60px 110px 1fr 1fr 90px 130px",
        alignItems: "center",
        gap: 16,
        transition: "border-color 0.15s",
        background: SURFACE,
      }}
    >
      <span style={{ fontSize: 11.5, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>#{String(task.id)}</span>
      <Badge status={task.status} />
      <div>
        <Label>Client</Label>
        <Field mono>{shorten(task.client)}</Field>
      </div>
      <div>
        <Label>Agent</Label>
        <Field mono>{task.agent !== "0x0000000000000000000000000000000000000000" ? shorten(task.agent) : <span style={{ color: DIM }}>unclaimed</span>}</Field>
      </div>
      <div>
        <Label>Deadline</Label>
        <Field mono><span style={{ color: expired ? RED : TEXT }}>{countdown}</span></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        <div style={{ textAlign: "right", marginRight: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{formatUSDC(task.reward)}</span>
          <span style={{ fontSize: 10.5, color: MUTED, marginLeft: 3 }}>USDC</span>
        </div>
        {canClaim && (
          <Btn tone="primary" disabled={!address} onClick={() => onClaim(task.id)}>Claim</Btn>
        )}
        {canProve && (
          <Btn tone="success" onClick={() => onProve(task)}>Prove →</Btn>
        )}
        {task.status === "Settled" && (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="7" stroke={GREEN} strokeWidth="1.2" />
            <path d="M4.5 7.5l2 2 4-4.5" stroke={GREEN} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

function ProofModal({ task, onClose, onSettled, walletClient, publicClient }) {
  const [stage, setStage] = useState(0);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const addLog = (msg) => setLog((l) => [...l, { time: new Date().toLocaleTimeString("en", { hour12: false }), msg }]);

  async function runProof() {
    if (!walletClient) { setError("Wallet not connected"); setRunning(false); return; }
    setRunning(true);
    setError(null);
    try {
      setStage(1); addLog("Loading circuit WASM..."); await sleep(400);
      const wasmResp = await fetch("/circuits/task_completion.wasm");
      const wasmBuf = await wasmResp.arrayBuffer();
      addLog("WASM loaded (" + (wasmBuf.byteLength / 1024).toFixed(0) + " KB)");

      addLog("Loading proving key..."); await sleep(300);
      const zkeyResp = await fetch("/circuits/task_completion_final.zkey");
      const zkeyBuf = await zkeyResp.arrayBuffer();
      addLog("Proving key loaded (" + (zkeyBuf.byteLength / 1024).toFixed(0) + " KB)");

      setStage(2); addLog("Building witness input..."); await sleep(300);
      const salt = BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(28))).map(b => b.toString(16).padStart(2, "0")).join(""));
      const input = {
        rawOutput: task._rawOutput.map(f => f.toString()),
        salt: salt.toString(),
        taskId: String(task.id),
        outputHash: task._outputHashBigInt.toString(),
        agentAddr: BigInt(task.agent).toString(),
      };
      addLog("Circuit inputs: taskId=" + task.id + " agent=" + shorten(task.agent));

      addLog("Generating Groth16 proof via snarkjs..."); await sleep(200);
      const { proof, publicSignals } = await groth16.fullProve(
        input,
        new Uint8Array(wasmBuf),
        new Uint8Array(zkeyBuf)
      );
      addLog("Proof generated. Public signals: " + publicSignals.join(", ").slice(0, 50) + "...");

      setStage(3); addLog("Submitting to SettlementGate.submitProof()..."); await sleep(200);
      const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const b = [[BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])], [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]];
      const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
      const pSignals = publicSignals.map(v => BigInt(v));
      const outputHash = toBytes32(task._outputHashBigInt);

      addLog("Sending tx to SettlementGate...");
      const txHash = await walletClient.writeContract({
        address: SG,
        abi: sgAbi,
        functionName: "submitProof",
        args: [BigInt(task.id), outputHash, { a, b, c }, pSignals],
      });
      addLog("Tx sent: " + txHash.slice(0, 18) + "...");

      addLog("Waiting for confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      addLog("Task settled! USDC released to agent.");

      setStage(4);
    } catch (err) {
      setError(err.message || "Proof submission failed");
      addLog("FAILED: " + (err.message || err));
    }
    setRunning(false);
  }

  return (
    <div onClick={() => !running && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, width: "100%", maxWidth: 480, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Submit ZK Proof</div>
            <div style={{ fontSize: 11.5, color: MUTED, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>Task #{task.id} · {formatUSDC(task.reward)} USDC in escrow</div>
          </div>
          {!running && <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>✕</button>}
        </div>
        <Pipeline stage={stage} />
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", minHeight: 110, maxHeight: 150, overflowY: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, display: "flex", flexDirection: "column", gap: 5 }}>
          {log.length === 0 && <span style={{ color: DIM }}>Waiting for proof submission…</span>}
          {log.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <span style={{ color: DIM, flexShrink: 0 }}>{l.time}</span>
              <span style={{ color: i === log.length - 1 ? GREEN : MUTED }}>{l.msg}</span>
            </div>
          ))}
        </div>
        {error && <div style={{ fontSize: 11, color: RED, textAlign: "center" }}>{error}</div>}
        {stage === 0 && (
          <Btn tone="success" onClick={runProof} style={{ alignSelf: "center", padding: "9px 22px", fontSize: 12.5 }}>
            Generate & Submit Proof
          </Btn>
        )}
        {stage === 4 && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 12.5, color: GREEN }}>{formatUSDC(task.reward)} USDC settled — no human approval needed</div>
            <Btn onClick={() => { onSettled(task.id); onClose(); }}>Close</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function PostTaskModal({ onClose, onPosted, walletClient, publicClient, address }) {
  const [reward, setReward] = useState("10");
  const [output, setOutput] = useState("");
  const [hours, setHours] = useState("2");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const inputStyle = { width: "100%", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "9px 11px", color: TEXT, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, outline: "none", boxSizing: "border-box" };

  async function handle() {
    if (!output || !reward || !walletClient) return;
    setPosting(true);
    setError(null);
    try {
      const rewardParsed = parseUnits(reward, 6);
      const deadlineSec = BigInt(Math.floor(Date.now() / 1000) + parseInt(hours) * 3600);
      const salt = BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(28))).map(b => b.toString(16).padStart(2, "0")).join(""));

      // Compute Poseidon hash
      const outputHashBigInt = await computeOutputHash(output, salt);
      const outputHash = toBytes32(outputHashBigInt);

      // Check USDC allowance
      const allowance = await publicClient.readContract({
        address: USDC, abi: erc20Abi, functionName: "allowance", args: [address, WR],
      });
      if (allowance < rewardParsed) {
        const approveHash = await walletClient.writeContract({
          address: USDC, abi: erc20Abi, functionName: "approve", args: [WR, rewardParsed],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Post task
      const txHash = await walletClient.writeContract({
        address: WR, abi: wrAbi, functionName: "postTask", args: [rewardParsed, outputHash, deadlineSec],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Extract taskId from logs
      let taskId = 0;
      if (receipt.logs && receipt.logs.length > 0) {
        const topicHash = "0x94a3840a3c3811a7ab2e8a09d5fa4c0620efb445a121ba2e60e5da2d07c091d";
        for (const log of receipt.logs) {
          if (log.topics[0] === topicHash) {
            taskId = Number(BigInt(log.topics[1]));
            break;
          }
        }
      }

      // Store rawOutput + salt data for proving
      const taskData = {
        id: taskId,
        reward: rewardParsed,
        outputHash: outputHash,
        client: address,
        agent: "0x0000000000000000000000000000000000000000",
        deadline: deadlineSec,
        status: "Open",
        _rawOutput: chunkOutput(output),
        _outputHashBigInt: outputHashBigInt,
        _salt: salt,
      };

      onPosted(taskData);
      onClose();
    } catch (err) {
      setError(err.message || "Posting failed");
    }
    setPosting(false);
  }

  return (
    <div onClick={() => !posting && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, width: "100%", maxWidth: 400, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Post a Task</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div>
          <Label>USDC Reward</Label>
          <input style={inputStyle} value={reward} onChange={(e) => setReward(e.target.value)} placeholder="10.00" />
        </div>
        <div>
          <Label>Expected Output</Label>
          <input style={inputStyle} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="e.g. Analyze this dataset…" />
          <div style={{ fontSize: 10, color: DIM, marginTop: 4 }}>Hashed via Poseidon on-chain; agent proves pre-image with ZK proof</div>
        </div>
        <div>
          <Label>Deadline (hours)</Label>
          <input style={inputStyle} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2" />
        </div>
        {error && <div style={{ fontSize: 11, color: RED, textAlign: "center" }}>{error}</div>}
        <Btn tone="primary" onClick={handle} disabled={posting} style={{ justifyContent: "center", padding: "10px" }}>
          {posting ? "Approving & Posting..." : "Lock USDC & Post Task"}
        </Btn>
      </div>
    </div>
  );
}

export default function ArcProof() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [tasks, setTasks] = useState([]);
  const [provingTask, setProvingTask] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingIds, setClaimingIds] = useState(new Set());
  const localData = useRef(new Map());

  // Load tasks from chain
  const loadTasks = useCallback(async () => {
    if (!publicClient) return;
    try {
      const nextId = await publicClient.readContract({
        address: WR, abi: wrAbi, functionName: "nextTaskId",
      });
      const promises = [];
      for (let i = 0; i < Number(nextId); i++) promises.push(
        publicClient.readContract({ address: WR, abi: wrAbi, functionName: "getTask", args: [BigInt(i)] })
      );
      const raw = await Promise.all(promises);
      setTasks(raw.map((t, i) => {
        const existing = localData.current.get(i);
        return {
          id: i,
          client: t[0],
          agent: t[1],
          reward: t[2],
          outputHash: t[3],
          deadline: t[4],
          status: STATUS_MAP[t[5]],
          _rawOutput: existing?._rawOutput || null,
          _outputHashBigInt: existing?._outputHashBigInt || null,
          _salt: existing?._salt || null,
        };
      }));
    } catch (e) {
      console.error("Failed to load tasks:", e);
    }
    setLoading(false);
  }, [publicClient]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { const iv = setInterval(loadTasks, 15000); return () => clearInterval(iv); }, [loadTasks]);

  const handlePosted = (taskData) => {
    localData.current.set(taskData.id, { _rawOutput: taskData._rawOutput, _outputHashBigInt: taskData._outputHashBigInt, _salt: taskData._salt });
    loadTasks();
  };

  const handleClaim = async (taskId) => {
    if (!walletClient || !publicClient) return;
    setClaimingIds(prev => new Set(prev).add(taskId));
    try {
      const hash = await walletClient.writeContract({
        address: WR, abi: wrAbi, functionName: "claimTask", args: [BigInt(taskId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      loadTasks();
    } catch (e) {
      console.error("Claim failed:", e);
    }
    setClaimingIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
  };

  const handleProve = (task) => {
    const cached = localData.current.get(task.id);
    if (!cached || !cached._rawOutput || !cached._outputHashBigInt) {
      alert("Cannot prove this task: raw output data not found.\n\nYou can only prove tasks you posted in this session (the raw output + salt are stored locally).");
      return;
    }
    setProvingTask({ ...task, _rawOutput: cached._rawOutput, _outputHashBigInt: cached._outputHashBigInt, _salt: cached._salt });
  };

  const handleSettled = (taskId) => {
    loadTasks();
  };

  const settled = tasks.filter((t) => t.status === "Settled");
  const escrowed = tasks.filter((t) => t.status === "Open" || t.status === "Proving").reduce((a, t) => a + t.reward, 0n);
  const settledTotal = settled.reduce((a, t) => a + t.reward, 0n);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes arcproof-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #232328; border-radius: 3px; }
      `}</style>

      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: `linear-gradient(135deg, ${BLUE}, ${GREEN})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L2 5v6l6 3 6-3V5L8 2z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M8 8l-6-3M8 8l6-3M8 8v6" stroke="white" strokeWidth="1.1" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>ArcProof</span>
          <span style={{ fontSize: 10.5, color: MUTED, fontFamily: "'JetBrains Mono', monospace", marginLeft: 4 }}>Arc Testnet · Chain {contracts.chainId}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 10.5, color: GREEN, background: "rgba(61,214,140,0.1)", border: `1px solid rgba(61,214,140,0.3)`, borderRadius: 5, padding: "3px 9px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN }} />
            Live
          </div>
          {!isConnected ? (
            <Btn tone="primary" onClick={() => connect({ connector: connectors[0] })}>Connect Wallet</Btn>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{shorten(address)}</span>
              <Btn tone="ghost" onClick={disconnect}>Disconnect</Btn>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 60px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 10.5, color: BLUE, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>
            ZK-Verified Settlement on Arc
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
            USDC only settles when<br />
            <span style={{ background: `linear-gradient(90deg, ${BLUE}, ${GREEN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              work is proven
            </span>
          </h1>
          <p style={{ marginTop: 10, fontSize: 13.5, color: MUTED, maxWidth: 440, margin: "10px auto 0", lineHeight: 1.6 }}>
            No human approval. No time-locks. A Groth16 proof gates every payment, end to end.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Stat label="Escrowed" value={`$${formatUSDC(escrowed)}`} color={BLUE} />
          <Stat label="Proofs Verified" value={settled.length} color={GREEN} />
          <Stat label="USDC Settled" value={`$${formatUSDC(settledTotal)}`} color={GREEN} />
          <Stat label="Active Tasks" value={tasks.filter((t) => t.status === "Open" || t.status === "Proving").length} />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Task Registry</span>
            {isConnected && <Btn tone="primary" onClick={() => setShowPost(true)}>+ Post Task</Btn>}
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: MUTED, fontSize: 13 }}>Loading tasks from chain…</div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: MUTED, fontSize: 13 }}>No tasks yet. Connect wallet and post one.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} onProve={handleProve} onClaim={handleClaim} proving={claimingIds.has(t.id)} address={address} />
              ))}
            </div>
          )}
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 26px" }}>
          <Label>How settlement works</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginTop: 10 }}>
            {[
              { n: "01", t: "Client posts task", b: "USDC locked in WorkRegistry with an outputHash and deadline." },
              { n: "02", t: "Agent proves work", b: "Groth16 ZK proof shows knowledge of the pre-image, off-chain via snarkjs." },
              { n: "03", t: "USDC settles", b: "Groth16Verifier checks the pairing on-chain. USDC transfers atomically." },
            ].map((s) => (
              <div key={s.n}>
                <div style={{ fontSize: 11, color: BLUE, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{s.n}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{s.t}</div>
                <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.55 }}>{s.b}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { name: "WorkRegistry", addr: WR },
            { name: "ProofVerifier", addr: contracts.proofVerifier },
            { name: "Groth16Verifier", addr: contracts.groth16Verifier },
            { name: "SettlementGate", addr: SG },
          ].map((c) => (
            <div key={c.name} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "11px 14px" }}>
              <Label>{c.name}</Label>
              <div style={{ fontSize: 10.5, color: BLUE, fontFamily: "'JetBrains Mono', monospace" }}>
                {shorten(c.addr)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {provingTask && (
        <ProofModal
          task={provingTask}
          onClose={() => setProvingTask(null)}
          onSettled={handleSettled}
          walletClient={walletClient}
          publicClient={publicClient}
        />
      )}
      {showPost && (
        <PostTaskModal
          onClose={() => setShowPost(false)}
          onPosted={handlePosted}
          walletClient={walletClient}
          publicClient={publicClient}
          address={address}
        />
      )}
    </div>
  );
}
