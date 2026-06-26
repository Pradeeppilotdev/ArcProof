export default function HowItWorks() {
  const steps = [
    { num: "01", title: "Client posts task", desc: "USDC locked in WorkRegistry with an outputHash and deadline." },
    { num: "02", title: "Agent proves work", desc: "Groth16 ZK proof shows knowledge of the pre-image, off-chain via snarkjs." },
    { num: "03", title: "USDC settles", desc: "Groth16Verifier checks the pairing on-chain. USDC transfers atomically." },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-4">How settlement works</div>
      <div className="grid grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <div key={s.num} className={i > 0 ? "border-l border-border pl-6" : ""}>
            <div className="text-xs font-mono text-primary mb-2">{s.num}</div>
            <div className="text-sm font-semibold mb-1.5">{s.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
