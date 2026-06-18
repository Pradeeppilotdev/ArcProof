import { useState, useEffect } from "react";
import contracts from "./contracts.json";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./components/ui/dialog";

const STATUS = { 0: "Open", 1: "Proving", 2: "Settled", 3: "Slashed" };

const MOCK_TASKS = [
  { id: "0", client: "0x3fA8...c291", agent: "0x7b2E...4f01", reward: "12.50", outputHash: "0xab3f...9e12", deadline: Date.now() + 2820000, status: "Proving" },
  { id: "1", client: "0x9cD1...881a", agent: null, reward: "5.00", outputHash: "0x54cc...7d3b", deadline: Date.now() + 7200000, status: "Open" },
  { id: "2", client: "0x1aE4...ff02", agent: "0xDead...Beef", reward: "30.00", outputHash: "0x9911...a0c3", deadline: Date.now() - 1000, status: "Settled" },
];

const NAV = [
  { label: "Dashboard", icon: "◇", active: true },
  { label: "Tasks", icon: "○" },
  { label: "Agents", icon: "□" },
  { label: "Contracts", icon: "△" },
  { label: "Settings", icon: "⚬" },
];

function Countdown({ deadline }) {
  const [rem, setRem] = useState(Math.max(0, deadline - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setRem(Math.max(0, deadline - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [deadline]);
  const m = Math.floor(rem / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  return rem > 0 ? `${m}m ${s}s` : "Expired";
}

const statusBadge = (s) => {
  const map = {
    Open: "border-zinc-700 text-zinc-400",
    Proving: "border-yellow-700 text-yellow-500",
    Settled: "border-emerald-700 text-emerald-500",
    Slashed: "border-red-700 text-red-500",
  };
  return map[s] || "";
};

function PipelineBar({ stage }) {
  const steps = [
    { label: "Escrow", sub: "USDC locked" },
    { label: "Proving", sub: "ZK witness" },
    { label: "Verifying", sub: "On-chain" },
    { label: "Settled", sub: "USDC released" },
  ];
  return (
    <div className="flex items-center justify-center py-4">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-mono transition-all duration-500 ${
              stage > i ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" :
              stage === i ? "border-zinc-100 bg-zinc-100/10 text-zinc-100 shadow-[0_0_12px_rgba(250,250,250,0.12)]" :
              "border-zinc-700 text-zinc-600"
            }`}>
              {stage > i ? "✓" : stage === i ? <span className="w-2 h-2 rounded-full bg-zinc-100 animate-pulse" /> : i + 1}
            </div>
            <div className="text-center">
              <div className={`text-[10px] font-semibold tracking-wider ${
                stage > i ? "text-emerald-500" : stage === i ? "text-zinc-100" : "text-zinc-600"
              }`}>{s.label}</div>
              <div className="text-[9px] text-zinc-600 font-mono">{s.sub}</div>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 h-[2px] mx-2 mb-6 rounded transition-all duration-500 ${
              stage > i ? "bg-emerald-500" : "bg-zinc-800"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task, onProve, onClaim }) {
  return (
    <div className="border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-500">#{task.id}</span>
            <Badge variant="outline" className={`text-[10px] px-2 py-0 ${statusBadge(task.status)}`}>
              {task.status}
            </Badge>
          </div>
          <div className="text-right">
            <span className="text-base font-semibold text-zinc-100">{task.reward}</span>
            <span className="text-[11px] text-zinc-500 ml-1">USDC</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-zinc-600 font-medium mb-1 text-[10px] uppercase tracking-wider">Client</div>
            <div className="font-mono text-zinc-300">{task.client}</div>
          </div>
          <div>
            <div className="text-zinc-600 font-medium mb-1 text-[10px] uppercase tracking-wider">Agent</div>
            <div className="font-mono text-zinc-300">{task.agent || <span className="text-zinc-600">Unclaimed</span>}</div>
          </div>
          <div>
            <div className="text-zinc-600 font-medium mb-1 text-[10px] uppercase tracking-wider">Output Hash</div>
            <div className="font-mono text-zinc-400 truncate">{task.outputHash}</div>
          </div>
          <div>
            <div className="text-zinc-600 font-medium mb-1 text-[10px] uppercase tracking-wider">Deadline</div>
            <div className="font-mono text-zinc-300"><Countdown deadline={task.deadline} /></div>
          </div>
        </div>
        <div className="mt-3">
          {task.status === "Open" && (
            <Button variant="outline" size="sm" onClick={() => onClaim(task.id)}>Claim Task</Button>
          )}
          {task.status === "Proving" && (
            <Button variant="outline" size="sm" className="text-emerald-500 border-emerald-800 hover:bg-emerald-950" onClick={() => onProve(task)}>
              Submit Proof →
            </Button>
          )}
          {task.status === "Settled" && (
            <div className="flex items-center gap-2 text-emerald-500 text-[11px]">
              <span>●</span>
              <span>USDC settled on-chain</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProofModal({ task, onClose }) {
  const [stage, setStage] = useState(0);
  const [log, setLog] = useState([]);
  const addLog = (msg) => setLog((l) => [...l, { time: new Date().toLocaleTimeString("en", { hour12: false }), msg }]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runProof() {
    setStage(1); addLog("Building witness from raw output + salt..."); await sleep(800);
    addLog("Computing Poseidon hash..."); await sleep(600);
    setStage(2); addLog("Generating Groth16 proof (snarkjs)..."); await sleep(1000);
    addLog("Proof generated."); await sleep(400);
    setStage(3); addLog("Sending tx to SettlementGate..."); await sleep(700);
    addLog("Groth16 pairing check → VALID"); await sleep(500);
    addLog("WorkRegistry.settleTask → USDC releasing..."); await sleep(600);
    addLog(`${task.reward} USDC transferred to agent`); await sleep(300);
    setStage(4); addLog("Settlement complete. Tx confirmed.");
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Submit Proof</DialogTitle>
        <DialogDescription>Task #{task.id} · {task.reward} USDC</DialogDescription>
      </DialogHeader>
      <DialogContent>
        <PipelineBar stage={stage} />
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 font-mono text-[11px] min-h-[100px] max-h-[140px] overflow-y-auto space-y-1.5">
          {log.length === 0 && <span className="text-zinc-700">Waiting for proof submission...</span>}
          {log.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-zinc-700 shrink-0">{l.time}</span>
              <span className={i === log.length - 1 ? "text-emerald-400" : "text-zinc-400"}>{l.msg}</span>
            </div>
          ))}
        </div>
        {stage === 0 && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" className="text-emerald-500 border-emerald-800 hover:bg-emerald-950" onClick={runProof}>
              Generate & Submit Proof
            </Button>
          </div>
        )}
        {stage === 4 && (
          <div className="text-center pt-2">
            <div className="text-2xl mb-1">✓</div>
            <div className="text-sm text-emerald-500 font-medium">{task.reward} USDC settled</div>
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}

function PostTaskModal({ onClose, onPost }) {
  const [reward, setReward] = useState("10");
  const [output, setOutput] = useState("");
  const [hours, setHours] = useState("2");

  function handle() {
    if (!output || !reward) return;
    onPost({
      reward,
      outputHash: "0x" + Math.random().toString(16).slice(2, 10) + "..." + Math.random().toString(16).slice(2, 6),
      deadline: Date.now() + parseInt(hours) * 3600000,
    });
    onClose();
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Post a Task</DialogTitle>
        <DialogDescription>Lock USDC in escrow with an output spec</DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4">
        {[
          { label: "USDC Reward", val: reward, set: setReward, placeholder: "10.00", hint: "Amount locked in escrow" },
          { label: "Expected Output", val: output, set: setOutput, placeholder: "e.g. Summarize this document...", hint: "Will be hashed as outputHash" },
          { label: "Deadline (hours)", val: hours, set: setHours, placeholder: "2", hint: "Agent must prove before this" },
        ].map((f) => (
          <div key={f.label} className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">{f.label}</label>
            <Input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
            <div className="text-[10px] text-zinc-700">{f.hint}</div>
          </div>
        ))}
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="default" size="sm" onClick={handle}>Lock USDC & Post</Button>
      </DialogFooter>
    </Dialog>
  );
}

export default function ArcProof() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [provingTask, setProvingTask] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [connected, setConnected] = useState(false);

  function handleClaim(id) {
    setTasks((ts) => ts.map((t) => t.id === id ? { ...t, status: "Proving", agent: "0xYou...r4dd" } : t));
  }

  function handlePost(data) {
    const id = String(tasks.length);
    setTasks((ts) => [...ts, { id, client: "0xYou...r4dd", agent: null, reward: data.reward, outputHash: data.outputHash, deadline: data.deadline, status: "Open" }]);
  }

  const settled = tasks.filter((t) => t.status === "Settled").length;
  const totalEscrowed = tasks.filter((t) => ["Open", "Proving"].includes(t.status)).reduce((a, t) => a + parseFloat(t.reward), 0);
  const settledUsdc = tasks.filter((t) => t.status === "Settled").reduce((a, t) => a + parseFloat(t.reward), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #09090b; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #141416; } ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }
      `}</style>

      {/* ─── Layout: sidebar + main ─── */}
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="w-56 border-r border-zinc-800 flex flex-col shrink-0">
          <div className="h-14 flex items-center gap-2.5 px-5 border-b border-zinc-800">
            <div className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L2 5v6l6 3 6-3V5L8 2z" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 8l-6-3M8 8l6-3M8 8v6" stroke="black" strokeWidth="1.2" />
              </svg>
            </div>
            <span className="text-sm font-semibold">ArcProof</span>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  item.active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                <span className="w-4 text-center text-xs opacity-60">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-zinc-800">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500">Arc Testnet</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400">Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Chain {contracts.chainId}
              </div>
              <Button variant="outline" size="sm" onClick={() => setConnected((w) => !w)}>
                {connected ? "0xYou...r4dd" : "Connect Wallet"}
              </Button>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-8">

              {/* Hero */}
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">ZK-Verified Settlement</h1>
                <p className="text-sm text-zinc-500">Proof-gated USDC payments on Arc — no trust required.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Total Escrowed", value: `$${totalEscrowed.toFixed(2)}`, change: "+2.5%" },
                  { label: "Active Tasks", value: tasks.filter((t) => t.status !== "Settled" && t.status !== "Slashed").length, change: "+1" },
                  { label: "Proofs Verified", value: settled, change: "100%" },
                  { label: "USDC Settled", value: `$${settledUsdc.toFixed(2)}`, change: "All time" },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-2">{s.label}</div>
                      <div className="text-2xl font-semibold">{s.value}</div>
                      <div className="text-[10px] text-zinc-700 mt-1">{s.change}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Task Registry */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold">Task Registry</h2>
                    <p className="text-xs text-zinc-600 mt-0.5">{tasks.length} tasks · {settled} settled</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowPost(true)}>
                    + Post Task
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} onProve={setProvingTask} onClaim={handleClaim} />
                  ))}
                </div>
              </section>

              {/* How It Works + Contracts row */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="col-span-2">
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-4">How Settlement Works</div>
                    <div className="grid grid-cols-3 gap-5">
                      {[
                        { step: "01", title: "Client posts task", body: "USDC locked in escrow with output hash and deadline." },
                        { step: "02", title: "Agent proves work", body: "Groth16 ZK proof shows knowledge of the pre-image." },
                        { step: "03", title: "USDC settles", body: "On-chain verification releases funds atomically." },
                      ].map((s) => (
                        <div key={s.step}>
                          <div className="text-[10px] font-mono text-zinc-600 mb-2">{s.step}</div>
                          <div className="text-xs font-semibold mb-1">{s.title}</div>
                          <div className="text-[11px] text-zinc-500 leading-relaxed">{s.body}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-3">Contracts</div>
                    <div className="space-y-3">
                      {[
                        { name: "WorkRegistry", addr: contracts.workRegistry },
                        { name: "ProofVerifier", addr: contracts.proofVerifier },
                        { name: "SettlementGate", addr: contracts.settlementGate },
                        { name: "USDC", addr: contracts.usdc },
                      ].map((c) => (
                        <div key={c.name}>
                          <div className="text-[10px] text-zinc-600 font-medium">{c.name}</div>
                          <div className="text-[11px] font-mono text-zinc-400 truncate">{c.addr.slice(0, 10)}...{c.addr.slice(-6)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {provingTask && <ProofModal task={provingTask} onClose={() => setProvingTask(null)} />}
      {showPost && <PostTaskModal onClose={() => setShowPost(false)} onPost={handlePost} />}
    </div>
  );
}
