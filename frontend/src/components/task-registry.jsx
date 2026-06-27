import { Button } from "./ui/button";
import { CheckCircleIcon } from "./icons";
import { useCountdown } from "../hooks/use-countdown";
import { formatUSDC, shorten } from "../lib/utils";

const STATUS_STYLES = {
  Open: { dot: "bg-[#c084b5]", text: "text-[#c084b5]" },
  Proving: { dot: "bg-[#e8799a]", text: "text-[#e8799a]" },
  Settled: { dot: "bg-[#818cf8]", text: "text-[#818cf8]" },
  Slashed: { dot: "bg-[#9a7b4f]", text: "text-[#9a7b4f]" },
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

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 rounded-lg border border-border bg-card px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm transition-shadow duration-300 hover:shadow-md animate-fade-up"
      style={{ animationDelay: `${0.05 * (index % 10)}s` }}
    >
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-0 flex-1 min-w-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
          <StatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <span className="text-sm font-semibold tabular-nums">{formatUSDC(task.reward)} <span className="text-[10px] text-muted-foreground font-normal">USDC</span></span>
          {canClaim && (
            <Button size="sm" variant="outline" disabled={claiming || !address} onClick={() => onClaim(task.id)} className="h-7 text-[10px] px-2">
              {claiming ? "..." : "Claim"}
            </Button>
          )}
          {canProve && (
            <Button size="sm" onClick={() => onProve(task)} className="h-7 text-[10px] px-2">
              Prove
            </Button>
          )}
          {task.status === "Settled" && (
            <span className="flex items-center gap-1 text-xs text-indigo font-medium">
              <CheckCircleIcon className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-white/60 min-w-0 flex-wrap sm:flex-nowrap">
        <span>{shorten(task.client)}</span>
        <span className="text-white/20 hidden sm:inline">&rarr;</span>
        <span className="text-white/20 sm:hidden">/</span>
        {hasAgent ? (
          <span>{shorten(task.agent)}</span>
        ) : (
          <span className="text-white/30 italic text-[10px] font-sans">no agent</span>
        )}
        <span className="text-white/15 mx-0.5 sm:ml-1 sm:mr-1.5">&middot;</span>
        <span className={`text-[11px] ${expired ? "text-white/30" : "text-white/60"}`}>{countdown}</span>
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold tabular-nums">{formatUSDC(task.reward)} <span className="text-[10px] text-muted-foreground font-normal">USDC</span></span>
        {canClaim && (
          <Button size="sm" variant="outline" disabled={claiming || !address} onClick={() => onClaim(task.id)} className="min-w-[80px] justify-center">
            {claiming ? "Claiming..." : "Claim"}
          </Button>
        )}
        {canProve && (
          <Button size="sm" onClick={() => onProve(task)} className="min-w-[80px] justify-center">
            Prove Work
          </Button>
        )}
        {task.status === "Settled" && (
          <span className="flex items-center gap-1.5 text-xs text-[#818cf8] font-medium">
            <CheckCircleIcon className="w-4 h-4" />
            Settled
          </span>
        )}
      </div>
    </div>
  );
}

export default function TaskRegistry({ tasks, loading, address, claimingIds, claimError, onClaim, onProve }) {
  const isExpired = (t) => Number(t.deadline) * 1000 < Date.now();
  const open = tasks.filter(t => (t.status === "Open" || t.status === "Proving") && !isExpired(t));

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
        <div className="rounded-lg border border-border bg-card p-8 sm:p-10 text-center">
          <div className="text-sm text-muted-foreground">Loading tasks from chain...</div>
        </div>
      ) : open.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 sm:p-10 text-center">
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
