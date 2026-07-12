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
  const [description, setDescription] = useState("");
  const [secret, setSecret] = useState("");
  const [duration, setDuration] = useState("2");
  const [unit, setUnit] = useState("hours");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [shake, setShake] = useState("");

  async function handle() {
    if (!secret || !reward || !description || !writeContractAsync || !address) {
      if (!secret) { setShake("secret"); setTimeout(() => setShake(""), 500); }
      if (!description) { setShake("desc"); setTimeout(() => setShake(""), 500); }
      if (!reward) { setShake("reward"); setTimeout(() => setShake(""), 500); }
      return;
    }
    setPosting(true);
    setError(null);
    setSuccess(null);
    try {
      const rewardParsed = parseUnits(reward, 6);
      const rewardFormatted = reward;
      const deadlineSec = BigInt(Math.floor(Date.now() / 1000) + parseInt(duration) * (unit === "hours" ? 3600 : 60));
      const salt = BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(28))).map(b => b.toString(16).padStart(2, "0")).join(""));

      const outputHashBigInt = await computeOutputHash(secret, salt);
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
        address: WR, abi: wrAbi, functionName: "postTask", args: [rewardParsed, outputHash, deadlineSec, salt, description],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const nextId = await publicClient.readContract({
        address: WR, abi: wrAbi, functionName: "nextTaskId",
      });
      const taskId = Number(nextId - 1n);

      onPosted({
        id: taskId,
        description,
        reward: rewardParsed,
        outputHash,
        client: address,
        agent: "0x0000000000000000000000000000000000000000",
        deadline: deadlineSec,
        status: "Open",
        _rawOutput: chunkOutput(secret),
        _outputHashBigInt: outputHashBigInt,
        _salt: salt,
        postTxHash: txHash,
      });

      setSuccess({ taskId, txHash, reward: rewardFormatted });
      setTimeout(() => setSuccess(null), 5000);
      setReward("10");
      setDescription("");
      setSecret("");
      setDuration("2");
      setUnit("hours");
    } catch (err) {
      const msg = err?.shortMessage || err?.cause?.message || err?.message || "";
      setError(msg.match(/denied|rejected|cancelled|cancel/i) ? "Cancelled" : msg || "Posting failed");
      setTimeout(() => setError(null), 2500);
    }
    setPosting(false);
  }

  if (!address) return null;

  return (
    <section className="rounded-xl border border-border bg-card glass-edge p-4 sm:p-5 shadow-sm animate-fade-up">
      <div className="text-sm font-semibold text-primary mb-1">Post a Challenge</div>
      <div className="text-[11px] text-muted-foreground mb-4">Lock USDC behind a secret answer. Whoever knows the answer can claim it.</div>

      <div className="mb-3 sm:mb-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
          <ZapIcon className="w-3 h-3" />
          Challenge Description <span className="text-white/40 normal-case font-normal">(visible to everyone)</span>
        </div>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. What is the capital of France?" className={`font-mono flex-1 ${shake === "desc" ? "shake" : ""}`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
            <DollarIcon className="w-3 h-3" />
            USDC Reward
          </div>
          <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="10.00" className={`font-mono ${shake === "reward" ? "shake" : ""}`} />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
            <ClockIcon className="w-3 h-3" />
            Deadline
          </div>
          <div className="flex gap-1.5">
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="2" className="font-mono flex-1" />
            <button onClick={() => setUnit(unit === "hours" ? "mins" : "hours")} className="text-[10px] font-mono text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1 transition-colors cursor-pointer shrink-0">{unit === "hours" ? "hours" : "mins"}</button>
          </div>
        </div>
        <div className="flex items-end">
          <Button onClick={handle} disabled={posting} className="w-full justify-center gap-2 h-9">
            {posting ? "Posting..." : "Lock USDC & Post"}
          </Button>
        </div>
      </div>

      <div className="mb-3 sm:mb-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
          <ZapIcon className="w-3 h-3" />
          Secret Answer <span className="text-white/40 normal-case font-normal">(hashed with ZK — nobody sees this)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="e.g. Paris" className={`font-mono flex-1 ${shake === "secret" ? "shake" : ""}`} />
          {secret && (
            <span className="text-[10px] text-muted-foreground self-start sm:self-center shrink-0">Hashed via Poseidon</span>
          )}
        </div>
      </div>

      <div className={`transition-all duration-300 ${error ? 'opacity-100 max-h-10 mb-3' : 'opacity-0 max-h-0 mb-0 overflow-hidden'}`}>
        <div className="text-xs text-destructive">{error || ""}</div>
      </div>

      {success && (
        <div className="rounded-lg bg-[#818cf8]/[0.15] border border-[#818cf8]/30 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 justify-between animate-scale-in">
          <div>
            <span className="text-xs font-medium text-[#818cf8]">Task #{success.taskId} posted</span>
            <span className="text-[10px] text-muted-foreground ml-2">{success.reward} USDC locked in escrow</span>
          </div>
          <a href={txUrl(success.txHash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#818cf8] hover:text-[#818cf8]/80 font-medium">
            Explorer <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>
      )}
    </section>
  );
}
