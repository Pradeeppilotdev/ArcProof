import { formatUSDC } from "../lib/utils";

const CARD = [
  { label: "Escrowed", bg: "bg-plum/[0.15]" },
  { label: "Proofs verified", bg: "bg-mauve/[0.15]" },
  { label: "USDC settled", bg: "bg-indigo/[0.15]" },
  { label: "Active tasks", bg: "bg-deepblue/[0.15]" },
];

const ANIMS = ["animate-fade-up", "animate-fade-up [animation-delay:0.1s]", "animate-fade-up [animation-delay:0.2s]", "animate-fade-up [animation-delay:0.3s]"];

export default function Stats({ escrowed, settledCount, settledTotal, activeCount }) {
  const items = [
    { label: "Escrowed", value: "$" + formatUSDC(escrowed) },
    { label: "Proofs verified", value: settledCount },
    { label: "USDC settled", value: "$" + formatUSDC(settledTotal) },
    { label: "Active tasks", value: activeCount },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div key={item.label} className={`rounded-xl border border-border ${CARD[i].bg} p-4 pt-3.5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${ANIMS[i]}`}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{item.label}</div>
          <div className="text-2xl font-semibold tabular-nums text-primary tracking-tight">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
