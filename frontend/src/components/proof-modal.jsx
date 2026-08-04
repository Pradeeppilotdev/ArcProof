import { useState, useRef } from "react";
import { groth16 } from "snarkjs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { CloseIcon, ZapIcon } from "./icons";
import { formatUSDC, shorten, toBytes32 } from "../lib/utils";
import { chunkOutput } from "../lib/poseidon";
import { SG, sgAbi } from "../lib/abis";

function Pipeline({ stage }) {
  const steps = [
    { label: "Escrow", sub: "USDC locked" },
    { label: "Proving", sub: "ZK witness" },
    { label: "Verifying", sub: "On-chain pairing" },
    { label: "Settled", sub: "USDC released" },
  ];

  return (
    <div className="flex items-start justify-center py-4 px-2 sm:px-0">
      {steps.map((s, i) => {
        const done = stage > i;
        const active = stage === i;
        const activeColor = "#818cf8";
        const inactiveColor = "rgba(255,255,255,0.25)";
        const inactiveText = "rgba(255,255,255,0.35)";
        return (
          <div key={s.label} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 min-w-0">
              <div
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0"
                style={{
                  borderColor: done || active ? activeColor : inactiveColor,
                  background: done ? activeColor : active ? activeColor : "transparent",
                }}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="sm:w-3 sm:h-3">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                ) : (
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: inactiveText }} />
                )}
              </div>
              <div className="text-center min-w-0 px-0.5">
                <div
                  className="text-[9px] sm:text-[11px] font-semibold transition-colors duration-500 leading-tight truncate"
                  style={{ color: done || active ? activeColor : inactiveText }}
                >
                  {s.label}
                </div>
                <div className="text-[7px] sm:text-[9px] text-muted-foreground font-mono mt-0.5 truncate">{s.sub}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mt-3 sm:mt-4 mx-1 sm:mx-2 transition-all duration-600"
                style={{ background: done ? activeColor : inactiveColor }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProofModal({ task, onClose, onSettled, writeContractAsync, publicClient }) {
  const txHashRef = useRef(null);
  const [stage, setStage] = useState(0);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [rawOutputInput, setRawOutputInput] = useState("");

  const needsRawOutput = !task._rawOutput;
  const challengeDesc = task.description || localStorage.getItem(`arcproof-desc-${task.id}`);

  const addLog = (msg) => setLog((l) => [...l, { time: new Date().toLocaleTimeString("en", { hour12: false }), msg }]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runProof() {
    if (!writeContractAsync) { setError("Wallet not connected"); setRunning(false); return; }
    if (needsRawOutput && !rawOutputInput.trim()) { setError("Enter the raw output to prove against this task"); setRunning(false); return; }
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
      const salt = task._salt;
      const rawChunks = needsRawOutput ? chunkOutput(rawOutputInput) : task._rawOutput;
      const input = {
        rawOutput: rawChunks.map(f => f.toString()),
        salt: salt.toString(),
        taskId: String(task.id),
        outputHash: (task._outputHashBigInt || 0n).toString(),
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
      txHashRef.current = txHash;
      addLog("Tx sent: " + txHash.slice(0, 18) + "...");

      addLog("Waiting for confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Transaction reverted on-chain: " + txHash);
      }
      addLog("Task settled! USDC released to agent.");

      setStage(4);
    } catch (err) {
      setError(err.message || "Proof submission failed");
      addLog("FAILED: " + (err.message || err));
      setTimeout(() => setError(null), 2500);
    }
    setRunning(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={() => !running && onClose()}
      onKeyDown={(e) => e.key === "Escape" && !running && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-modal-title"
        className="backdrop-blur-[16px] rounded-2xl w-full max-w-[480px] max-h-[85vh] overflow-auto glass-edge border border-white/30"
        style={{ background: 'rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div id="proof-modal-title" className="text-sm font-semibold">Submit ZK Proof</div>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">Task #{task.id} &middot; {formatUSDC(task.reward)} USDC in escrow</div>
            </div>
            {!running && (
              <button onClick={onClose} aria-label="Close dialog" className="text-muted-foreground hover:text-foreground cursor-pointer">
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {needsRawOutput && stage === 0 && (
          <div className="px-6 pb-3 space-y-3">
            {challengeDesc && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Challenge</div>
                <div className="text-sm text-white/90 bg-black/15 rounded-lg px-3 py-2">{challengeDesc}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Your Raw Output</div>
              <Input
                value={rawOutputInput}
                onChange={(e) => setRawOutputInput(e.target.value)}
                placeholder='e.g. "Paris" — type the exact secret answer'
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}
        <div className="px-6">
          <Pipeline stage={stage} />
        </div>
        <div className="px-6 pb-4">
          <div className="backdrop-blur-[8px] rounded-xl p-3 min-h-[110px] max-h-[150px] overflow-y-auto overscroll-contain font-mono text-[11px] space-y-1.5 border border-white/20" style={{ background: 'rgba(0,0,0,0.15)' }}>
            {log.length === 0 && <span className="text-muted-foreground">Waiting for proof submission...</span>}
            {log.map((l, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-muted-foreground shrink-0">{l.time}</span>
                <span className={i === log.length - 1 ? "text-foreground" : "text-muted-foreground"}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`px-6 pb-3 transition-all duration-300 ${error ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <div className="text-[11px] text-destructive text-center">{error || ""}</div>
        </div>
        <div className="p-6 pt-0 flex justify-center">
          {stage === 0 && (
            <button onClick={runProof} className="glass-card rounded-full px-6 py-2 text-xs gap-2 inline-flex items-center justify-center disabled:opacity-50">
              <ZapIcon className="w-3.5 h-3.5" />
              Generate and Submit Proof
            </button>
          )}
          {stage === 4 && (
            <div className="text-center space-y-3">
              <div className="text-xs text-muted-foreground">{formatUSDC(task.reward)} USDC settled</div>
              <button onClick={() => { onSettled(task.id, txHashRef.current); onClose(); }} className="glass-card rounded-full text-xs px-4 py-1.5 inline-flex items-center justify-center">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
