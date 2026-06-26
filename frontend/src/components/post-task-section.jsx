import { useState } from "react";
import { parseUnits } from "viem";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DollarIcon, ZapIcon, ClockIcon, ExternalLinkIcon } from "./icons";
import { WR, USDC, wrAbi, erc20Abi } from "../lib/abis";
import { computeOutputHash, chunkOutput } from "../lib/poseidon";
import { toBytes32 } from "../lib/utils";
import { txUrl } from "../lib/explorer";

export default function PostTaskSection({ writeContractAsync, publicClient, address, onPosted }) {
  const [reward, setReward] = useState("10");
  const [output, setOutput] = useState("");
  const [hours, setHours] = useState("2");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handle() {
    if (!output || !reward || !writeContractAsync || !address) return;
    setPosting(true);
    setError(null);
    setSuccess(null);
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

      onPosted({
        id: taskId,
        reward: rewardParsed,
        outputHash,
        client: address,
        agent: "0x0000000000000000000000000000000000000000",
        deadline: deadlineSec,
        status: "Open",
        _rawOutput: chunkOutput(output),
        _outputHashBigInt: outputHashBigInt,
        _salt: salt,
        postTxHash: txHash,
      });

      setSuccess({ taskId, txHash });
      setReward("10");
      setOutput("");
      setHours("2");
    } catch (err) {
      setError(err.message || "Posting failed");
    }
    setPosting(false);
  }

  if (!address) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm animate-fade-up">
      <div className="text-sm font-semibold text-primary mb-4">Post a Task</div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
            <DollarIcon className="w-3 h-3" />
            USDC Reward
          </div>
          <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="10.00" className="font-mono" />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
            <ClockIcon className="w-3 h-3" />
            Deadline (hours)
          </div>
          <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2" className="font-mono" />
        </div>
        <div className="flex items-end">
          <Button onClick={handle} disabled={posting} className="w-full justify-center gap-2 h-9">
            {posting ? "Posting..." : "Lock USDC & Post"}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
          <ZapIcon className="w-3 h-3" />
          Expected Output
        </div>
        <div className="flex gap-2">
          <Input value={output} onChange={(e) => setOutput(e.target.value)} placeholder="e.g. Analysis result: QmXy..." className="font-mono flex-1" />
          {output && (
            <span className="text-[10px] text-muted-foreground self-center shrink-0">Hashed via Poseidon</span>
          )}
        </div>
      </div>

      {error && <div className="text-xs text-destructive mb-3">{error}</div>}

      {success && (
        <div className="rounded-lg bg-indigo/[0.2] border border-indigo/30 px-4 py-3 flex items-center justify-between animate-scale-in">
          <div>
            <span className="text-xs font-medium text-indigo">Task #{success.taskId} posted</span>
            <span className="text-[10px] text-muted-foreground ml-2">{reward} USDC locked in escrow</span>
          </div>
          <a href={txUrl(success.txHash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-indigo hover:text-indigo/80 font-medium">
            Explorer <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>
      )}
    </section>
  );
}
