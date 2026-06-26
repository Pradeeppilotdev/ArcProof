import { formatUSDC } from "../lib/utils";

export default function Stats({ escrowed, settledCount, settledTotal, activeCount }) {
  const items = [
    { label: "Escrowed", value: "$" + formatUSDC(escrowed) },
    { label: "Proofs verified", value: settledCount },
    { label: "USDC settled", value: "$" + formatUSDC(settledTotal) },
    { label: "Active tasks", value: activeCount },
  ];

  return (
    <div className="rounded-xl border border-border bg-card/40 grid grid-cols-2 sm:grid-cols-4 overflow-hidden">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={
            "px-5 py-4 " +
            (i !== 0 ? "border-l border-border " : "") +
            (i < 2 ? "border-b sm:border-b-0 border-border" : "")
          }
        >
          <div className="text-[11px] text-muted-foreground tracking-tight mb-1.5">{item.label}</div>
          <div className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
