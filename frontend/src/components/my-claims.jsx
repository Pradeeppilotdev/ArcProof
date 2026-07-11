import { useState } from "react";
import { Button } from "./ui/button";
import { formatUSDC, shorten } from "../lib/utils";

export default function MyClaims({ tasks, address, onSlash, slashingIds }) {
  const [err, setErr] = useState(null);

  if (!address) return null;
  const claimed = tasks.filter(t => {
    if (t.status !== "Proving" && t.status !== "Settled" && t.status !== "Slashed") return false;
    return t.agent?.toLowerCase() === address.toLowerCase();
  });

  return (
    <section className="animate-fade-up [animation-delay:0.15s]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">My Claims</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{claimed.length} claim{claimed.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className={`transition-all duration-300 ${err ? 'opacity-100 max-h-10 mb-3' : 'opacity-0 max-h-0 mb-0 overflow-hidden'}`}>
        <div className="text-xs text-destructive">{err || ""}</div>
      </div>
      {claimed.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 sm:p-8 text-center">
          <div className="text-sm text-muted-foreground">You haven&apos;t claimed any challenges yet. Browse open tasks and claim one.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {claimed.map((t) => {
            const expired = Number(t.deadline) * 1000 < Date.now();
            return (
              <div key={t.id} className="rounded-lg border border-border bg-card px-3 sm:px-4 py-3 sm:py-3.5 shadow-sm transition-shadow duration-300 hover:shadow-md animate-fade-up">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono">#{t.id}</span>
                    {t.description && (
                      <div className="text-sm text-white/90 mt-1 leading-snug">{t.description}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-white/40 mt-1">
                      <span className="font-semibold tabular-nums text-primary">{formatUSDC(t.reward)} USDC</span>
                      <span className="text-white/10">&middot;</span>
                      <span className="text-white/30">by {shorten(t.client)}</span>
                      <span className="text-white/10">&middot;</span>
                      <span className={`${expired ? "text-[#9a7b4f]" : "text-white/50"}`}>{expired ? "Expired" : `${Math.max(0, Math.floor((Number(t.deadline) * 1000 - Date.now()) / 3600000))}h left`}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.status === "Settled" && (
                      <span className="text-[10px] font-medium text-[#818cf8] bg-[#818cf8]/10 border border-[#818cf8]/30 rounded-full px-2.5 py-1">Settled</span>
                    )}
                    {t.status === "Slashed" && (
                      <span className="text-[10px] font-medium text-[#9a7b4f] bg-[#9a7b4f]/10 border border-[#9a7b4f]/30 rounded-full px-2.5 py-1">Slashed</span>
                    )}
                    {t.status === "Proving" && expired && (
                      <Button
                        disabled={slashingIds?.has(t.id)}
                        onClick={() => { setErr(null); onSlash?.(t.id); }}
                        className="glass-card rounded-full text-[10px] px-3 py-1 min-w-[70px] justify-center disabled:opacity-50"
                      >
                        {slashingIds?.has(t.id) ? "..." : "Slash"}
                      </Button>
                    )}
                    {t.status === "Proving" && !expired && (
                      <span className="text-[10px] font-medium text-[#e8799a] bg-[#e8799a]/10 border border-[#e8799a]/30 rounded-full px-2.5 py-1">Proving</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}