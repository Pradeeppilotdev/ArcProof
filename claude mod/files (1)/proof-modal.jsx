import { useState } from "react";
import { groth16 } from "snarkjs";
import { Button } from "./ui/button";
import { CloseIcon, ShieldCheckIcon, CheckCircleIcon, ZapIcon } from "./icons";
import { formatUSDC, shorten, toBytes32 } from "../lib/utils";
import { SG, sgAbi } from "../lib/abis";

const STAGE_COLORS = ["#4d4d57", "#6e6bfb", "#e0a73e", "#6e6bfb", "#34d399"];

function Pipeline({ stage }) {
  const steps = [
    { label: "Escrow", sub: "USDC locked" },
    { label: "Proving", sub: "ZK witness" },
    { label: "Verifying", sub: "On-chain pairing" },
    { label: "Settled", sub: "USDC released" },
  ];

  return (
    <div className="flex items-start justify-center py-4">
      {steps.map((s, i) => {
        const done = stage > i;
        const active = stage === i;
        const color = STAGE_COLORS[done ? 4 : active ? 1 : 0];
        return (
          <div key={s.label} className="flex items-start">
            <div className="flex flex-col items-center gap-2" style={{ width: 84 }}>
              <div
                className="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500"
                style={{
                  borderColor: color,
                  background: done ? "rgba(52,211,153,0.12)" : active ? "rgba(110,107,251,0.12)" : "transparent",
                }}
              >
                {done ? (
                  <CheckCircleIcon className="w-4 h-4" style={{ color: "#34d399" }} />
                ) : active ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4d4d57" }} />
                )}
              </div>
              <div className="text-center">
                <div className="text-[11px] font-semibold transition-colors duration-500" style={{ color: done ? "#34d399" : active ? "#f2f2f4" : "#87878f" }}>
                  {s.label}
                </div>
                <div className="text-[9.5px] text-muted-foreground font-mono mt-0.5">{s.sub}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-9 h-0.5 mt-4 transition-all duration-600"
                style={{ background: stage > i ? "#34d399" : "#1d1d22" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProofModal({ task, onClose, onSettled, writeContractAsync, publicClient }) {
  const [stage, setStage] = useState(0);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const addLog = (msg) => setLog((l) => [...l, { time: new Date().toLocaleTimeString("en", { hour12: false }), msg }]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runProof() {
    if (!writeContractAsync) { setError("Wallet not connected"); setRunning(false); return; }
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
      const txHash = await writeContractAsync({
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => !running && onClose()}>
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-[480px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">Submit ZK Proof</div>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">Task #{task.id} · {formatUSDC(task.reward)} USDC in escrow</div>
            </div>
            {!running && (
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="px-6">
          <Pipeline stage={stage} />
        </div>
        <div className="px-6 pb-4">
          <div className="bg-background border border-border rounded-lg p-3 min-h-[110px] max-h-[150px] overflow-y-auto font-mono text-[11px] space-y-1.5">
            {log.length === 0 && <span className="text-muted-foreground">Waiting for proof submission...</span>}
            {log.map((l, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-muted-foreground shrink-0">{l.time}</span>
                <span className={i === log.length - 1 ? "text-emerald-400" : "text-muted-foreground"}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
        {error && (
          <div className="px-6 pb-3">
            <div className="text-[11px] text-red-400 text-center">{error}</div>
          </div>
        )}
        <div className="p-6 pt-0 flex justify-center">
          {stage === 0 && (
            <Button onClick={runProof} className="px-6 py-2 text-xs gap-2">
              <ZapIcon className="w-3.5 h-3.5" />
              Generate and Submit Proof
            </Button>
          )}
          {stage === 4 && (
            <div className="text-center space-y-3">
              <div className="text-xs text-emerald-400">{formatUSDC(task.reward)} USDC settled — no human approval needed</div>
              <Button variant="outline" size="sm" onClick={() => { onSettled(task.id); onClose(); }}>Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
