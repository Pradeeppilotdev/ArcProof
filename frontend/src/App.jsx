import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { WR, STATUS_MAP, wrAbi } from "./lib/abis";
import Header from "./components/header";
import Hero from "./components/hero";
import Stats from "./components/stats";
import TaskRegistry from "./components/task-registry";
import HowItWorks from "./components/how-it-works";
import ProofModal from "./components/proof-modal";
import PostTaskModal from "./components/post-task-modal";

const PROOF_STORAGE_KEY = "arcproof-proofs";

export default function ArcProof() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [tasks, setTasks] = useState([]);
  const [provingTask, setProvingTask] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingIds, setClaimingIds] = useState(new Set());
  const [claimError, setClaimError] = useState(null);

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
      const stored = JSON.parse(localStorage.getItem(PROOF_STORAGE_KEY) || "{}");
      setTasks(prev => {
        const prevMap = new Map(prev.map(t => [t.id, t]));
        return raw.map((t, i) => {
          const existing = prevMap.get(i);
          const fromStorage = stored[i];
          const fromStorageRaw = fromStorage ? fromStorage._rawOutput.map(s => BigInt(s)) : null;
          const fromStorageHash = fromStorage ? BigInt(fromStorage._outputHashBigInt) : null;
          const fromStorageSalt = fromStorage ? BigInt(fromStorage._salt) : null;
          return {
            id: i,
            client: t.client || t[0],
            agent: t.agent || t[1] || "0x0000000000000000000000000000000000000000",
            reward: t.reward ?? t[2] ?? 0n,
            outputHash: t.outputHash || t[3] || "0x0000000000000000000000000000000000000000000000000000000000000000",
            deadline: t.deadline ?? t[4] ?? 0n,
            status: STATUS_MAP[t.status ?? t[5]] || "Open",
            _rawOutput: fromStorageRaw || existing?._rawOutput || null,
            _outputHashBigInt: fromStorageHash || existing?._outputHashBigInt || null,
            _salt: fromStorageSalt || existing?._salt || null,
          };
        });
      });
    } catch (e) {
      console.error("Failed to load tasks:", e);
    }
    setLoading(false);
  }, [publicClient]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { const iv = setInterval(loadTasks, 15000); return () => clearInterval(iv); }, [loadTasks]);

  const handlePosted = (taskData) => {
    const stored = JSON.parse(localStorage.getItem(PROOF_STORAGE_KEY) || "{}");
    stored[taskData.id] = {
      _rawOutput: taskData._rawOutput.map(f => f.toString()),
      _outputHashBigInt: taskData._outputHashBigInt.toString(),
      _salt: taskData._salt.toString(),
    };
    localStorage.setItem(PROOF_STORAGE_KEY, JSON.stringify(stored));
    setTasks(prev => [...prev, taskData]);
    loadTasks();
  };

  const handleClaim = async (taskId) => {
    if (!writeContractAsync || !publicClient) return;
    setClaimingIds(prev => new Set(prev).add(taskId));
    try {
      const hash = await writeContractAsync({
        address: WR, abi: wrAbi, functionName: "claimTask", args: [BigInt(taskId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      loadTasks();
    } catch (e) {
      setClaimError(e?.reason || e?.shortMessage || e.message || "Claim failed");
      setTimeout(() => setClaimError(null), 5000);
    }
    setClaimingIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
  };

  const handleProve = (task) => {
    if (!task._rawOutput || !task._outputHashBigInt || !task._salt) {
      alert("Cannot prove this task: raw output data not found.\n\nYou can only prove tasks you posted in this session (the raw output + salt are stored in localStorage).");
      return;
    }
    setProvingTask(task);
  };

  const handleSettled = () => { loadTasks(); };

  const settled = tasks.filter(t => t.status === "Settled");
  const escrowed = tasks.filter(t => t.status === "Open" || t.status === "Proving").reduce((a, t) => a + t.reward, 0n);
  const settledTotal = settled.reduce((a, t) => a + t.reward, 0n);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Header />
      <main className="max-w-[980px] mx-auto px-6 py-10 space-y-8 pb-16">
        <Hero />
        <Stats
          escrowed={escrowed}
          settledCount={settled.length}
          settledTotal={settledTotal}
          activeCount={tasks.filter(t => t.status === "Open" || t.status === "Proving").length}
        />
        <TaskRegistry
          tasks={tasks}
          loading={loading}
          address={address}
          claimingIds={claimingIds}
          claimError={claimError}
          onClaim={handleClaim}
          onProve={handleProve}
          onPost={() => setShowPost(true)}
        />
        <HowItWorks />
      </main>
      {provingTask && (
        <ProofModal
          task={provingTask}
          onClose={() => setProvingTask(null)}
          onSettled={handleSettled}
          writeContractAsync={writeContractAsync}
          publicClient={publicClient}
        />
      )}
      {showPost && (
        <PostTaskModal
          onClose={() => setShowPost(false)}
          onPosted={handlePosted}
          writeContractAsync={writeContractAsync}
          publicClient={publicClient}
          address={address}
        />
      )}
    </div>
  );
}
