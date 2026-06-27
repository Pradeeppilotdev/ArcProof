import { ExternalLinkIcon } from "./icons";
import { formatUSDC, shorten } from "../lib/utils";
import { txUrl } from "../lib/explorer";

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

const STEP_CONFIG = [
  { key: "posted", label: "Posted", color: "#818cf8" },
  { key: "accepted", label: "Accepted", color: "#818cf8" },
  { key: "settled", label: "Settled", color: "#818cf8" },
];

function Stepper({ task }) {
  const stages = [
    { key: "posted", done: !!task._postTxHash, hash: task._postTxHash },
    { key: "accepted", done: task.agent !== "0x0000000000000000000000000000000000000000", hash: task._claimTxHash },
    { key: "settled", done: task.status === "Settled", hash: task._proveTxHash },
  ];
  const activeCount = stages.filter(s => s.done).length;

  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => {
        const url = s.hash ? txUrl(s.hash) : null;
        const isActive = s.done;
        const isLast = i === stages.length - 1;
        const label = STEP_CONFIG[i].label;

        return (
          <div key={s.key} className="flex items-center">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 text-[10px] font-medium transition-colors
                  ${isActive ? "text-[#818cf8]" : "text-white/20"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isActive ? "bg-[#818cf8]" : "bg-white/15"} ${isActive ? "shadow-[0_0_6px_rgba(129,140,248,0.5)]" : ""}`}
                />
                {label}
                <ExternalLinkIcon className="w-2 h-2" />
              </a>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-medium
                  ${isActive ? "text-[#818cf8]" : "text-white/20"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isActive ? "bg-[#818cf8]" : "bg-white/15"} ${isActive ? "shadow-[0_0_6px_rgba(129,140,248,0.5)]" : ""}`}
                />
                {label}
              </span>
            )}
            {!isLast && (
              <span className={`mx-2 w-6 h-px ${activeCount > i ? "bg-[#818cf8]/40" : "bg-white/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 sm:px-4 py-3 sm:py-3.5 shadow-sm transition-shadow duration-300 hover:shadow-md animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
          <StatusBadge status={task.status} />
        </div>
        <Stepper task={task} />
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
