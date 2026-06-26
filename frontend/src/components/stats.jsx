import { formatUSDC } from "../lib/utils";

export default function Stats({ escrowed, settledCount, settledTotal, activeCount }) {
  const items = [
    { label: "Escrowed", value: "$" + formatUSDC(escrowed) },
    { label: "Proofs verified", value: settledCount },
    { label: "USDC settled", value: "$" + formatUSDC(settledTotal) },
    { label: "Active tasks", value: activeCount },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{item.label}</div>
          <div className="text-xl font-semibold tabular-nums text-primary">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
