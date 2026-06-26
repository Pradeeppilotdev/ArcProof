import { Button } from "./ui/button";
import { CheckCircleIcon } from "./icons";
import { useCountdown } from "../hooks/use-countdown";
import { formatUSDC, shorten } from "../lib/utils";

const STATUS_STYLES = {
  Open: { dot: "bg-plum", text: "text-plum" },
  Proving: { dot: "bg-mauve", text: "text-mauve" },
  Settled: { dot: "bg-indigo", text: "text-indigo" },
  Slashed: { dot: "bg-deepblue", text: "text-deepblue" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { dot: "bg-muted-foreground", text: "text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function TaskRow({ task, address, onClaim, onProve, claiming, index }) {
  const countdown = useCountdown(task.deadline);
  const expired = Number(task.deadline) * 1000 < Date.now();
  const isAgent = address && task.agent && address.toLowerCase() === task.agent.toLowerCase();
  const canClaim = task.status === "Open" && address && !expired;
  const canProve = task.status === "Proving" && isAgent && !expired;
  const hasAgent = task.agent !== "0x0000000000000000000000000000000000000000";
  const delay = 0.05 * (index % 10);

  return (
    <div
      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-4 min-w-0 shrink-0">
        <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
        <StatusBadge status={task.status} />
      </div>
      <div className="flex items-center gap-3 text-xs font-mono text-foreground min-w-0">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">client</span>
        <span className="shrink-0">{shorten(task.client)}</span>
        <span className="text-muted-foreground mx-0.5">&rarr;</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">agent</span>
        {hasAgent ? (
          <span className="shrink-0">{shorten(task.agent)}</span>
        ) : (
          <span className="text-muted-foreground shrink-0">unclaimed</span>
        )}
        <span className="text-muted-foreground ml-1 mr-1.5">&middot;</span>
        <span className={`shrink-0 ${expired ? "text-muted-foreground" : ""}`}>{countdown}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold tabular-nums">{formatUSDC(task.reward)} <span className="text-[10px] text-muted-foreground font-normal">USDC</span></span>
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
          <span className="flex items-center gap-1 text-xs text-indigo font-medium">
            <CheckCircleIcon className="w-4 h-4" />
            Settled
          </span>
        )}
      </div>
    </div>
  );
}

export default function TaskRegistry({ tasks, loading, address, claimingIds, claimError, onClaim, onProve }) {
  const open = tasks.filter(t => t.status === "Open" || t.status === "Proving");

  return (
    <section className="animate-fade-up [animation-delay:0.2s]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">Open Tasks</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{open.length} available to claim</p>
        </div>
      </div>
      {claimError && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 mb-3 animate-scale-in">{claimError}</div>
      )}
      {loading ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <div className="text-sm text-muted-foreground">Loading tasks from chain...</div>
        </div>
      ) : open.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <div className="text-sm text-muted-foreground">No open tasks. Connect wallet and post one.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {open.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              address={address}
              onClaim={onClaim}
              onProve={onProve}
              claiming={claimingIds.has(t.id)}
              index={i}
            />
          ))}
        </div>
      )}
    </section>
  );
}
