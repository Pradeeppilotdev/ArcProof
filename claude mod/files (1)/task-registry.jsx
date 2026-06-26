import { Button } from "./ui/button";
import { PlusCircleIcon, CheckCircleIcon } from "./icons";
import { useCountdown } from "../hooks/use-countdown";
import { formatUSDC, shorten } from "../lib/utils";

const STATUS_DOT = {
  Open: "bg-primary",
  Proving: "bg-amber-400",
  Settled: "bg-emerald-400",
  Slashed: "bg-red-400",
};

const STATUS_TEXT = {
  Open: "text-foreground",
  Proving: "text-amber-300",
  Settled: "text-emerald-300",
  Slashed: "text-red-300",
};

function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-tight">
      <span className={"h-1.5 w-1.5 rounded-full " + (STATUS_DOT[status] || "bg-muted")} />
      <span className={STATUS_TEXT[status] || "text-muted-foreground"}>{status}</span>
    </span>
  );
}

function TaskRow({ task, address, onClaim, onProve, claiming }) {
  const countdown = useCountdown(task.deadline);
  const expired = Number(task.deadline) * 1000 < Date.now();
  const isAgent = address && task.agent && address.toLowerCase() === task.agent.toLowerCase();
  const isClient = address && task.client && address.toLowerCase() === task.client.toLowerCase();
  const canClaim = task.status === "Open" && address && !expired;
  const canProve = task.status === "Proving" && isAgent && !expired;

  return (
    <div className="group flex items-center justify-between rounded-lg border border-border bg-card/40 px-5 py-4 hover:bg-card hover:border-border/150 transition-colors">
      <div className="flex items-center gap-4 w-[148px] shrink-0">
        <span className="text-[12px] text-muted-foreground/70 font-mono">#{task.id}</span>
        <StatusBadge status={task.status} />
      </div>
      <div className="flex items-center gap-8 flex-1">
        <div className="w-[110px]">
          <div className="text-[10.5px] text-muted-foreground/80 tracking-tight mb-0.5">Client</div>
          <span className="font-mono text-[12.5px]">{shorten(task.client)}</span>
        </div>
        <div className="w-[110px]">
          <div className="text-[10.5px] text-muted-foreground/80 tracking-tight mb-0.5">Agent</div>
          {task.agent !== "0x0000000000000000000000000000000000000000" ? (
            <span className="font-mono text-[12.5px]">{shorten(task.agent)}</span>
          ) : (
            <span className="font-mono text-[12.5px] text-muted-foreground/60">unclaimed</span>
          )}
        </div>
        <div className="w-[90px]">
          <div className="text-[10.5px] text-muted-foreground/80 tracking-tight mb-0.5">Deadline</div>
          <span className={"font-mono text-[12.5px] " + (expired ? "text-red-400" : "")}>{countdown}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[14px] font-semibold tabular-nums">{formatUSDC(task.reward)} <span className="text-[11.5px] text-muted-foreground font-normal">USDC</span></span>
        {canClaim && (
          <Button size="sm" variant="outline" disabled={claiming || !address} onClick={() => onClaim(task.id)}>
            {claiming ? "Claiming..." : "Claim"}
          </Button>
        )}
        {canProve && (
          <Button size="sm" onClick={() => onProve(task)}>
            Prove
          </Button>
        )}
        {task.status === "Settled" && (
          <CheckCircleIcon className="w-4.5 h-4.5 text-emerald-400" />
        )}
      </div>
    </div>
  );
}

export default function TaskRegistry({ tasks, loading, address, claimingIds, claimError, onClaim, onProve, onPost }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground/90">Task Registry</h2>
        {address && (
          <Button size="sm" onClick={onPost}>
            <PlusCircleIcon className="w-3.5 h-3.5" />
            Post Task
          </Button>
        )}
      </div>
      {claimError && (
        <div className="text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 mb-3">{claimError}</div>
      )}
      {loading ? (
        <div className="text-center py-12 text-[13px] text-muted-foreground">Loading tasks from chain...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-[13px] text-muted-foreground">No tasks yet. Connect wallet and post one.</div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              address={address}
              onClaim={onClaim}
              onProve={onProve}
              claiming={claimingIds.has(t.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
