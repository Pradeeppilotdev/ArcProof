import { formatUSDC } from "../lib/utils";

const ANIMS = ["animate-fade-up", "animate-fade-up [animation-delay:0.1s]", "animate-fade-up [animation-delay:0.2s]", "animate-fade-up [animation-delay:0.3s]"];

export default function Stats({ escrowed, settledCount, settledTotal, activeCount }) {
  const items = [
    { label: "Escrowed", value: "$" + formatUSDC(escrowed), bg: "bg-plum/[0.15]" },
    { label: "Proofs verified", value: settledCount, bg: "bg-mauve/[0.15]" },
    { label: "USDC settled", value: "$" + formatUSDC(settledTotal), bg: "bg-indigo/[0.15]" },
    { label: "Active tasks", value: activeCount, bg: "bg-deepblue/[0.15]" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item, i) => (
        <div key={item.label} className={`rounded-xl border border-border ${item.bg} p-3 sm:p-4 sm:pt-3.5 shadow-sm transition-shadow duration-300 hover:shadow-md ${ANIMS[i]}`}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{item.label}</div>
          <div className="text-xl sm:text-2xl font-semibold tabular-nums text-primary tracking-tight">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
