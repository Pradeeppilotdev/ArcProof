import { ExternalLinkIcon } from "./icons";
import { formatUSDC, shorten } from "../lib/utils";
import { txUrl } from "../lib/explorer";

const STEP_LABELS = ["Posted", "Proving", "Settled"];

function Stepper({ task }) {
  const stages = [
    { done: true, hash: task._postTxHash },
    { done: task.status === "Proving" || task.status === "Settled", hash: task.status === "Settled" ? task._proveTxHash : task._claimTxHash },
    { done: task.status === "Settled", hash: task._proveTxHash },
  ];
  const activeIdx = stages.findLastIndex(s => s.done);

  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => {
        const url = s.hash ? txUrl(s.hash) : null;
        const isActive = s.done;
        const isCurrent = i === activeIdx;
        const isLast = i === stages.length - 1;

        const dot = (
          <span
            className={`w-2 h-2 rounded-full ${
              isActive
                ? "bg-[#818cf8] shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                : "bg-white/25"
            }`}
          />
        );

        const label = (
          <span
            className={`text-[10px] font-medium ${
              isActive ? "text-[#818cf8]" : "text-white/35"
            }`}
          >
            {STEP_LABELS[i]}
          </span>
        );

        const connector = !isLast && (
          <span
            className={`mx-2 w-6 h-px ${
              s.done ? "bg-[#818cf8]/40" : "bg-white/15"
            }`}
          />
        );

        return (
          <div key={STEP_LABELS[i]} className="flex items-center">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors"
              >
                {dot}
                {label}
                {isCurrent && <ExternalLinkIcon className="w-2.5 h-2.5 text-[#818cf8]" />}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                {dot}
                {label}
              </span>
            )}
            {connector}
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
        <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
        <Stepper task={task} />
      </div>
      {task.description && (
        <div className="text-sm text-white/90 mb-1.5 leading-snug">{task.description}</div>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-white/40">
        <span className="font-semibold tabular-nums text-primary">{formatUSDC(task.reward)} USDC</span>
        {task._rawOutput && (
          <span className="text-white/30 text-[10px]">secret stored locally</span>
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
          <div className="text-sm text-muted-foreground">You haven&apos;t posted any challenges yet. Post one above to get started.</div>
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
