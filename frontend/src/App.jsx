import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { WR, STATUS_MAP, wrAbi } from "./lib/abis";
import { arcTestnet } from "./lib/wagmi";
import Header from "./components/header";
import Hero from "./components/hero";
import Stats from "./components/stats";
import PostTaskSection from "./components/post-task-section";
import MyTasks from "./components/my-tasks";
import TaskRegistry from "./components/task-registry";
import HowItWorks from "./components/how-it-works";
import ProofModal from "./components/proof-modal";
import ErrorBoundary from "./components/error-boundary";

const PROOF_STORAGE_KEY = "arcproof-proofs";

export default function ArcZK() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [provingTask, setProvingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingIds, setClaimingIds] = useState(new Set());
  const [claimError, setClaimError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          const fromStorageRaw = fromStorage?._rawOutput ? fromStorage._rawOutput.map(s => BigInt(s)) : null;
          const fromStorageHash = fromStorage?._outputHashBigInt ? BigInt(fromStorage._outputHashBigInt) : null;
          const fromStorageSalt = fromStorage?._salt ? BigInt(fromStorage._salt) : null;
          const chainOutputHash = t.outputHash || t[3] || "0x0000000000000000000000000000000000000000000000000000000000000000";
          return {
            id: i,
            client: t.client || t[0],
            agent: t.agent || t[1] || "0x0000000000000000000000000000000000000000",
            reward: t.reward ?? t[2] ?? 0n,
            outputHash: chainOutputHash,
            deadline: t.deadline ?? t[4] ?? 0n,
            status: STATUS_MAP[t.status ?? t[5]] || "Open",
            description: t.description || t[7] || existing?.description || "",
            _rawOutput: fromStorageRaw || existing?._rawOutput || null,
            _outputHashBigInt: fromStorageHash || existing?._outputHashBigInt || BigInt(chainOutputHash),
            _salt: (t.salt ?? t[6]) ?? fromStorageSalt ?? existing?._salt ?? 0n,
            _postTxHash: fromStorage?._postTxHash || existing?._postTxHash || null,
            _claimTxHash: fromStorage?._claimTxHash || existing?._claimTxHash || null,
            _proveTxHash: fromStorage?._proveTxHash || existing?._proveTxHash || null,
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

  const saveToStorage = (taskId, fields) => {
    const stored = JSON.parse(localStorage.getItem(PROOF_STORAGE_KEY) || "{}");
    stored[taskId] = { ...(stored[taskId] || {}), ...fields };
    localStorage.setItem(PROOF_STORAGE_KEY, JSON.stringify(stored));
  };

  const handlePosted = (taskData) => {
    saveToStorage(taskData.id, {
      _rawOutput: taskData._rawOutput.map(f => f.toString()),
      _outputHashBigInt: taskData._outputHashBigInt.toString(),
      _salt: taskData._salt.toString(),
      _postTxHash: taskData.postTxHash,
    });
    setTasks(prev => [...prev, taskData]);
    loadTasks();
  };

  const handleClaim = async (taskId) => {
    if (!writeContractAsync || !publicClient) return;
    setClaimingIds(prev => new Set(prev).add(taskId));
    try {
      const hash = await writeContractAsync({
        address: WR, abi: wrAbi, functionName: "claimTask", args: [BigInt(taskId)], chain: arcTestnet,
      });
      const claimReceipt = await publicClient.waitForTransactionReceipt({ hash });
      if (claimReceipt.status !== "success") {
        throw new Error("Claim transaction reverted on-chain");
      }
      saveToStorage(taskId, { _claimTxHash: hash });
      loadTasks();
    } catch (e) {
      const msg = e?.shortMessage || e?.cause?.message || e?.message || "";
      setClaimError(msg.match(/denied|rejected|cancelled|cancel/i) ? "Request cancelled" : "Claim failed");
      setTimeout(() => setClaimError(null), 5000);
    }
    setClaimingIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
  };

  const handleProve = (task) => {
    setProvingTask(task);
  };

  const handleSettled = (taskId, txHash) => {
    if (txHash) saveToStorage(taskId, { _proveTxHash: txHash });
    loadTasks();
  };

  const settled = tasks.filter(t => t.status === "Settled");
  const escrowed = tasks.filter(t => t.status === "Open" || t.status === "Proving").reduce((a, t) => a + t.reward, 0n);
  const settledTotal = settled.reduce((a, t) => a + t.reward, 0n);

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-background text-foreground antialiased transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <Header />
        <main className="max-w-[980px] mx-auto px-6 py-10 pb-20">
          <div className="space-y-6">
            <Hero />
            <Stats
              escrowed={escrowed}
              settledCount={settled.length}
              settledTotal={settledTotal}
              activeCount={tasks.filter(t => t.status === "Open" || t.status === "Proving").length}
            />
          </div>
          <div className="mt-8 space-y-8">
            <PostTaskSection
              writeContractAsync={writeContractAsync}
              publicClient={publicClient}
              address={address}
              onPosted={handlePosted}
            />
            <MyTasks tasks={tasks} address={address} />
            <TaskRegistry
              tasks={tasks}
              loading={loading}
              address={address}
              claimingIds={claimingIds}
              claimError={claimError}
              onClaim={handleClaim}
              onProve={handleProve}
            />
            <HowItWorks />
          </div>
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
      </div>
    </ErrorBoundary>
  );
}
