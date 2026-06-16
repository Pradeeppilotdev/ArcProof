import { useState, useEffect, useRef } from "react";

// ─── Mock data & constants ────────────────────────────────────────────────────

const ARC_BLUE = "#5B8DEF";
const PROOF_GREEN = "#00E5A0";
const SLASH_RED = "#FF4D6D";
const MUTED = "#8892AA";

const MOCK_TASKS = [
  {
    id: "0",
    client: "0x3fA8...c291",
    agent: "0x7b2E...4f01",
    reward: "12.50",
    outputHash: "0xab3f...9e12",
    deadline: Date.now() + 1000 * 60 * 47,
    status: "Proving",
  },
  {
    id: "1",
    client: "0x9cD1...881a",
    agent: null,
    reward: "5.00",
    outputHash: "0x54cc...7d3b",
    deadline: Date.now() + 1000 * 60 * 120,
    status: "Open",
  },
  {
    id: "2",
    client: "0x1aE4...ff02",
    agent: "0xDead...Beef",
    reward: "30.00",
    outputHash: "0x9911...a0c3",
    deadline: Date.now() - 1000,
    status: "Settled",
  },
];

const STATUS_COLOR = {
  Open: ARC_BLUE,
  Proving: "#F5A623",
  Settled: PROOF_GREEN,
  Slashed: SLASH_RED,
};

function useCountdown(deadline) {
  const [remaining, setRemaining] = useState(Math.max(0, deadline - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setRemaining(Math.max(0, deadline - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [deadline]);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return remaining > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : "Expired";
}

// ─── Pipeline Stage Component ─────────────────────────────────────────────────

function PipelineStage({ label, sublabel, active, done, isLast }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: `2px solid ${done ? PROOF_GREEN : active ? ARC_BLUE : "#1E2D42"}`,
            background: done ? PROOF_GREEN + "22" : active ? ARC_BLUE + "22" : "#0A1628",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.5s ease",
            boxShadow: active ? `0 0 20px ${ARC_BLUE}55` : done ? `0 0 20px ${PROOF_GREEN}44` : "none",
          }}
        >
          {done ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke={PROOF_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: active ? ARC_BLUE : "#1E2D42",
                transition: "background 0.5s",
                animation: active ? "pulse 1.5s infinite" : "none",
              }}
            />
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: done ? PROOF_GREEN : active ? "#E8EDF5" : MUTED, fontFamily: "'Space Grotesk', sans-serif", transition: "color 0.5s" }}>{label}</div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{sublabel}</div>
        </div>
      </div>
      {!isLast && (
        <div
          style={{
            width: 80,
            height: 2,
            margin: "0 8px",
            marginBottom: 28,
            background: done ? `linear-gradient(90deg, ${PROOF_GREEN}, ${PROOF_GREEN})` : `linear-gradient(90deg, #1E2D42, #1E2D42)`,
            borderRadius: 2,
            transition: "background 0.8s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {active && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent, ${ARC_BLUE}, transparent)`,
                animation: "flow 1.2s linear infinite",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onProve, onClaim }) {
  const countdown = useCountdown(task.deadline);
  const expired = task.deadline < Date.now();

  return (
    <div
      style={{
        background: "#0A1628",
        border: `1px solid #1E2D42`,
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "border-color 0.2s",
        cursor: "default",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A3D55")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E2D42")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: MUTED }}>Task #{task.id}</span>
          <span
            style={{
              background: STATUS_COLOR[task.status] + "22",
              color: STATUS_COLOR[task.status],
              border: `1px solid ${STATUS_COLOR[task.status]}44`,
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {task.status}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
            {task.reward} <span style={{ fontSize: 12, color: MUTED, fontWeight: 400 }}>USDC</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Client</div>
          <div style={{ fontSize: 12, color: "#C8D4E8", fontFamily: "'JetBrains Mono', monospace" }}>{task.client}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Agent</div>
          <div style={{ fontSize: 12, color: task.agent ? "#C8D4E8" : MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{task.agent || "Unclaimed"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Output Hash</div>
          <div style={{ fontSize: 12, color: "#C8D4E8", fontFamily: "'JetBrains Mono', monospace" }}>{task.outputHash}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Deadline</div>
          <div style={{ fontSize: 12, color: expired ? SLASH_RED : "#C8D4E8", fontFamily: "'JetBrains Mono', monospace" }}>{countdown}</div>
        </div>
      </div>

      {task.status === "Open" && (
        <button onClick={() => onClaim(task.id)} style={{ ...btnStyle(ARC_BLUE), alignSelf: "flex-start" }}>
          Claim Task
        </button>
      )}
      {task.status === "Proving" && (
        <button onClick={() => onProve(task)} style={{ ...btnStyle(PROOF_GREEN), alignSelf: "flex-start" }}>
          Submit Proof →
        </button>
      )}
      {task.status === "Settled" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 3" stroke={PROOF_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 12, color: PROOF_GREEN, fontFamily: "'Space Grotesk', sans-serif" }}>USDC settled on-chain</span>
        </div>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    background: color + "18",
    border: `1px solid ${color}55`,
    color: color,
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: "pointer",
    transition: "all 0.15s",
    letterSpacing: "0.04em",
  };
}

// ─── Proof Modal ──────────────────────────────────────────────────────────────

function ProofModal({ task, onClose }) {
  const [stage, setStage] = useState(0); // 0=idle 1=generating 2=verifying 3=settling 4=done
  const [log, setLog] = useState([]);

  const stages = [
    { label: "ESCROW", sublabel: "USDC locked", active: stage === 0, done: stage > 0 },
    { label: "PROVING", sublabel: "ZK witness", active: stage === 1 || stage === 2, done: stage > 2 },
    { label: "VERIFYING", sublabel: "On-chain check", active: stage === 3, done: stage > 3 },
    { label: "SETTLED", sublabel: "USDC released", active: false, done: stage === 4 },
  ];

  function addLog(msg) {
    setLog(l => [...l, { time: new Date().toLocaleTimeString("en", { hour12: false }), msg }]);
  }

  async function runProof() {
    setStage(1);
    addLog("Building witness from raw output + salt...");
    await sleep(900);
    addLog("Computing Poseidon hash of output...");
    await sleep(700);
    addLog(`Hash computed: ${task.outputHash}`);
    await sleep(500);
    setStage(2);
    addLog("Generating Groth16 proof (snarkjs)...");
    await sleep(1200);
    addLog("Proof generated: π.A, π.B, π.C ready");
    await sleep(400);
    setStage(3);
    addLog(`Sending tx to SettlementGate.submitProof(${task.id})...`);
    await sleep(800);
    addLog("ProofVerifier.verify() → public inputs matched");
    await sleep(600);
    addLog("Groth16 pairing check → VALID ✓");
    await sleep(500);
    addLog(`WorkRegistry.settleTask(${task.id}) → USDC releasing...`);
    await sleep(700);
    addLog(`${task.reward} USDC transferred to ${task.agent}`);
    await sleep(300);
    setStage(4);
    addLog("Settlement complete. Tx confirmed on Arc testnet.");
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  return (
    <div style={{ position: "fixed", inset: 0, background: "#080E1Acc", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <div style={{ background: "#0D1929", border: "1px solid #1E2D42", borderRadius: 16, width: "100%", maxWidth: 540, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>Submit Proof</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>Task #{task.id} · {task.reward} USDC</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Pipeline */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
          {stages.map((s, i) => (
            <PipelineStage key={s.label} {...s} isLast={i === stages.length - 1} />
          ))}
        </div>

        {/* Log */}
        <div
          style={{
            background: "#080E1A",
            border: "1px solid #1E2D42",
            borderRadius: 8,
            padding: "12px 16px",
            minHeight: 120,
            maxHeight: 160,
            overflowY: "auto",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#8892AA",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {log.length === 0 && <span style={{ color: "#4A5568" }}>Waiting for proof submission...</span>}
          {log.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#4A5568", flexShrink: 0 }}>{l.time}</span>
              <span style={{ color: i === log.length - 1 ? PROOF_GREEN : "#8892AA" }}>{l.msg}</span>
            </div>
          ))}
        </div>

        {stage === 0 && (
          <button onClick={runProof} style={{ ...btnStyle(PROOF_GREEN), padding: "12px 24px", fontSize: 13, alignSelf: "center" }}>
            Generate & Submit Proof
          </button>
        )}
        {stage === 4 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>✓</div>
            <div style={{ fontSize: 14, color: PROOF_GREEN, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginTop: 4 }}>
              {task.reward} USDC settled — no human approval needed
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Post Task Modal ──────────────────────────────────────────────────────────

function PostTaskModal({ onClose, onPost }) {
  const [reward, setReward] = useState("10");
  const [output, setOutput] = useState("");
  const [hours, setHours] = useState("2");

  function handle() {
    if (!output || !reward) return;
    onPost({ reward, outputHash: "0x" + Math.random().toString(16).slice(2, 10) + "..." + Math.random().toString(16).slice(2, 6), deadline: Date.now() + parseInt(hours) * 3600000 });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#080E1Acc", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <div style={{ background: "#0D1929", border: "1px solid #1E2D42", borderRadius: 16, width: "100%", maxWidth: 440, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>Post a Task</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {[
          { label: "USDC Reward", val: reward, set: setReward, placeholder: "10.00", hint: "Amount locked in escrow" },
          { label: "Expected Output (any text)", val: output, set: setOutput, placeholder: "e.g. Summarize this document...", hint: "Will be hashed as outputHash" },
          { label: "Deadline (hours)", val: hours, set: setHours, placeholder: "2", hint: "Agent must prove before this" },
        ].map(f => (
          <div key={f.label}>
            <label style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{f.label}</label>
            <input
              value={f.val}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{ width: "100%", background: "#080E1A", border: "1px solid #1E2D42", borderRadius: 8, padding: "10px 12px", color: "#E8EDF5", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 10, color: "#4A5568", marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{f.hint}</div>
          </div>
        ))}

        <button onClick={handle} style={{ ...btnStyle(ARC_BLUE), padding: "12px", fontSize: 13, textAlign: "center" }}>
          Lock USDC & Post Task
        </button>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#0A1628", border: "1px solid #1E2D42", borderRadius: 10, padding: "16px 20px", flex: 1 }}>
      <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function ArcProof() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [provingTask, setProvingTask] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  function handleClaim(id) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status: "Proving", agent: "0xYou...r4dd" } : t));
  }

  function handlePost(data) {
    const id = String(tasks.length);
    setTasks(ts => [...ts, { id, client: "0xYou...r4dd", agent: null, reward: data.reward, outputHash: data.outputHash, deadline: data.deadline, status: "Open" }]);
  }

  const settled = tasks.filter(t => t.status === "Settled").length;
  const totalEscrowed = tasks.filter(t => ["Open", "Proving"].includes(t.status)).reduce((a, t) => a + parseFloat(t.reward), 0);
  const proofs = tasks.filter(t => t.status === "Settled").reduce((a, t) => a + parseFloat(t.reward), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #080E1A; }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
        @keyframes flow { 0% { transform:translateX(-100%); } 100% { transform:translateX(200%); } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0A1628; } ::-webkit-scrollbar-thumb { background: #1E2D42; border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080E1A", color: "#E8EDF5", fontFamily: "'Inter', sans-serif" }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid #1E2D42", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${ARC_BLUE}, ${PROOF_GREEN})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L2 5v6l6 3 6-3V5L8 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 8l-6-3M8 8l6-3M8 8v6" stroke="white" strokeWidth="1.2" />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#E8EDF5" }}>ArcProof</span>
              <span style={{ fontSize: 10, color: MUTED, fontFamily: "'JetBrains Mono', monospace", marginLeft: 8 }}>Arc Testnet</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: PROOF_GREEN, fontFamily: "'JetBrains Mono', monospace", background: PROOF_GREEN + "15", border: `1px solid ${PROOF_GREEN}33`, borderRadius: 6, padding: "4px 10px" }}>
              ● Live
            </div>
            <button
              onClick={() => setWalletConnected(w => !w)}
              style={{ ...btnStyle(walletConnected ? PROOF_GREEN : ARC_BLUE), padding: "7px 14px" }}
            >
              {walletConnected ? "0xYou...r4dd" : "Connect Wallet"}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Hero */}
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{ fontSize: 11, color: ARC_BLUE, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
              ZK-Verified Settlement on Arc
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 300, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              USDC only settles when<br />
              <span style={{ fontWeight: 700, background: `linear-gradient(90deg, ${ARC_BLUE}, ${PROOF_GREEN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                work is proven
              </span>
            </h1>
            <p style={{ marginTop: 12, fontSize: 14, color: MUTED, maxWidth: 480, margin: "12px auto 0", lineHeight: 1.6 }}>
              No human approval. No time-locks. Cryptographic proof gates every payment.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 12 }}>
            <StatCard label="Escrowed" value={`$${totalEscrowed.toFixed(2)}`} color={ARC_BLUE} />
            <StatCard label="Proofs Verified" value={settled} color={PROOF_GREEN} />
            <StatCard label="USDC Settled" value={`$${proofs.toFixed(2)}`} color={PROOF_GREEN} />
            <StatCard label="Network" value="Arc Testnet" />
          </div>

          {/* Tasks */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
                Task Registry
              </span>
              <button onClick={() => setShowPost(true)} style={{ ...btnStyle(ARC_BLUE), padding: "8px 14px" }}>
                + Post Task
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tasks.map(t => (
                <TaskCard key={t.id} task={t} onProve={setProvingTask} onClaim={handleClaim} />
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: "#0A1628", border: "1px solid #1E2D42", borderRadius: 12, padding: "24px 28px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
              How settlement works
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                { step: "01", title: "Client posts task", body: "USDC locked in WorkRegistry.sol with an outputHash and deadline." },
                { step: "02", title: "Agent proves work", body: "Groth16 ZK proof shows knowledge of the pre-image. Circuit runs off-chain." },
                { step: "03", title: "USDC settles", body: "SettlementGate verifies proof on-chain. USDC transfers atomically. No trust needed." },
              ].map(s => (
                <div key={s.step}>
                  <div style={{ fontSize: 11, color: ARC_BLUE, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>{s.step}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{s.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contract addresses */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { name: "WorkRegistry", addr: "0xTBD...deploy" },
              { name: "ProofVerifier", addr: "0xTBD...deploy" },
              { name: "SettlementGate", addr: "0xTBD...deploy" },
            ].map(c => (
              <div key={c.name} style={{ background: "#0A1628", border: "1px solid #1E2D42", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: ARC_BLUE, fontFamily: "'JetBrains Mono', monospace" }}>{c.addr}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {provingTask && <ProofModal task={provingTask} onClose={() => setProvingTask(null)} />}
      {showPost && <PostTaskModal onClose={() => setShowPost(false)} onPost={handlePost} />}
    </>
  );
}
