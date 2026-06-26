import { ExternalLinkIcon } from "./icons";
import { formatUSDC, shorten } from "../lib/utils";
import { txUrl } from "../lib/explorer";

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

function LifecycleLink({ label, txHash, active }) {
  const url = txUrl(txHash);
  if (!active || !url) {
    return (
      <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded border border-border/50 cursor-default">{label}</span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-indigo hover:text-indigo/80 px-2 py-0.5 rounded border border-indigo/20 hover:border-indigo/40 transition-colors">
      {label} <ExternalLinkIcon className="w-2.5 h-2.5" />
    </a>
  );
}

function TaskCard({ task }) {
  const stages = [
    { label: "Posted", txHash: task._postTxHash, active: true },
    { label: "Accepted", txHash: task._claimTxHash, active: task.agent !== "0x0000000000000000000000000000000000000000" },
    { label: "Settled", txHash: task._proveTxHash, active: task.status === "Settled" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card px-3 sm:px-4 py-3 sm:py-3.5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
          <StatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {stages.map((s) => (
            <LifecycleLink key={s.label} label={s.label} txHash={s.txHash} active={s.active} />
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 text-xs">
        <span className="font-semibold tabular-nums text-primary">{formatUSDC(task.reward)} <span className="text-[10px] text-muted-foreground font-normal">USDC</span></span>
        <span className="text-muted-foreground font-mono text-[10px]">hash: {shorten(task.outputHash)}</span>
        {task._rawOutput && (
          <span className="text-muted-foreground text-[10px]">raw output stored</span>
        )}
      </div>
    </div>
  );
}

export default function MyTasks({ tasks, address }) {
  if (!address) return null;
  const mine = tasks.filter(t => t.client?.toLowerCase() === address.toLowerCase());

  return (
    <section className="animate-fade-up [animation-delay:0.1s]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">My Tasks</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{mine.length} task{mine.length !== 1 ? "s" : ""} posted</p>
        </div>
      </div>
      {mine.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 sm:p-8 text-center">
          <div className="text-sm text-muted-foreground">You haven&apos;t posted any tasks yet.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}
