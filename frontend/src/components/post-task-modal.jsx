import { useState } from "react";
import { parseUnits } from "viem";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { CloseIcon, DollarIcon, ZapIcon, ClockIcon } from "./icons";
import { WR, USDC, wrAbi, erc20Abi } from "../lib/abis";
import { computeOutputHash, chunkOutput } from "../lib/poseidon";
import { toBytes32 } from "../lib/utils";

export default function PostTaskModal({ onClose, onPosted, writeContractAsync, publicClient, address }) {
  const [reward, setReward] = useState("10");
  const [output, setOutput] = useState("");
  const [hours, setHours] = useState("2");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  async function handle() {
    if (!output || !reward || !writeContractAsync) return;
    setPosting(true);
    setError(null);
    try {
      const rewardParsed = parseUnits(reward, 6);
      const deadlineSec = BigInt(Math.floor(Date.now() / 1000) + parseInt(hours) * 3600);
      const salt = BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(28))).map(b => b.toString(16).padStart(2, "0")).join(""));

      const outputHashBigInt = await computeOutputHash(output, salt);
      const outputHash = toBytes32(outputHashBigInt);

      const allowance = await publicClient.readContract({
        address: USDC, abi: erc20Abi, functionName: "allowance", args: [address, WR],
      });
      if (allowance < rewardParsed) {
        const approveHash = await writeContractAsync({
          address: USDC, abi: erc20Abi, functionName: "approve", args: [WR, rewardParsed],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const txHash = await writeContractAsync({
        address: WR, abi: wrAbi, functionName: "postTask", args: [rewardParsed, outputHash, deadlineSec],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const nextId = await publicClient.readContract({
        address: WR, abi: wrAbi, functionName: "nextTaskId",
      });
      const taskId = Number(nextId - 1n);

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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => !posting && onClose()}>
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-[400px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Post a Task</div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="px-6 pb-4 space-y-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <DollarIcon className="w-3 h-3" />
              USDC Reward
            </div>
            <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="10.00" className="font-mono" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <ZapIcon className="w-3 h-3" />
              Expected Output
            </div>
            <Input value={output} onChange={(e) => setOutput(e.target.value)} placeholder="e.g. Analyze this dataset..." className="font-mono" />
            <div className="text-[10px] text-muted-foreground mt-1">Hashed via Poseidon on-chain; agent proves pre-image with ZK proof</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <ClockIcon className="w-3 h-3" />
              Deadline (hours)
            </div>
            <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2" className="font-mono" />
          </div>
          {error && <div className="text-xs text-red-400 text-center">{error}</div>}
        </div>
        <div className="p-6 pt-0">
          <Button onClick={handle} disabled={posting} className="w-full justify-center gap-2">
            {posting ? "Approving and Posting..." : "Lock USDC and Post Task"}
          </Button>
        </div>
      </div>
    </div>
  );
}
