import { formatUSDC } from "../lib/utils";

export default function Stats({ escrowed, settledCount, settledTotal, activeCount }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <StatCard label="Escrowed" value={"\u0024" + formatUSDC(escrowed)} />
      <StatCard label="Proofs Verified" value={settledCount} />
      <StatCard label="USDC Settled" value={"\u0024" + formatUSDC(settledTotal)} />
      <StatCard label="Active Tasks" value={activeCount} />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
