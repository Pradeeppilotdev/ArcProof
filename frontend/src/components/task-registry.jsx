import { Button } from "./ui/button";
import { PlusCircleIcon, CheckCircleIcon } from "./icons";
import { useCountdown } from "../hooks/use-countdown";
import { formatUSDC, shorten } from "../lib/utils";

const STATUS_STYLE = {
  Open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Proving: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Settled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Slashed: "bg-red-500/10 text-red-400 border-red-500/20",
};

function StatusBadge({ status }) {
  return (
    <span className={"inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + (STATUS_STYLE[status] || "")}>
      {status}
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
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5 hover:border-muted transition-colors">
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground font-mono w-8 shrink-0">#{task.id}</span>
        <StatusBadge status={task.status} />
      </div>
      <div className="flex items-center gap-8">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Client</div>
          <span className="font-mono text-xs">{shorten(task.client)}</span>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Agent</div>
          {task.agent !== "0x0000000000000000000000000000000000000000" ? (
            <span className="font-mono text-xs">{shorten(task.agent)}</span>
          ) : (
            <span className="font-mono text-xs text-muted-foreground">unclaimed</span>
          )}
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Deadline</div>
          <span className={"font-mono text-xs " + (expired ? "text-red-400" : "")}>{countdown}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{formatUSDC(task.reward)} <span className="text-xs text-muted-foreground font-normal">USDC</span></span>
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
          <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
        )}
      </div>
    </div>
  );
}

export default function TaskRegistry({ tasks, loading, address, claimingIds, claimError, onClaim, onProve, onPost }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Task Registry</h2>
        {address && (
          <Button size="sm" onClick={onPost}>
            <PlusCircleIcon className="w-3.5 h-3.5" />
            Post Task
          </Button>
        )}
      </div>
      {claimError && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 mb-3">{claimError}</div>
      )}
      {loading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Loading tasks from chain...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">No tasks yet. Connect wallet and post one.</div>
      ) : (
        <div className="space-y-2.5">
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
