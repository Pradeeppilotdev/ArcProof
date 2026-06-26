export default function HowItWorks() {
  const steps = [
    { num: "01", title: "Client posts task", desc: "USDC locked in WorkRegistry with an outputHash and deadline." },
    { num: "02", title: "Agent proves work", desc: "Groth16 ZK proof shows knowledge of the pre-image, off-chain via snarkjs." },
    { num: "03", title: "USDC settles", desc: "Groth16Verifier checks the pairing on-chain. USDC transfers atomically." },
  ];

  return (
    <section className="rounded-xl border border-border bg-card/40 p-7">
      <div className="text-[11px] font-medium text-muted-foreground tracking-tight mb-5">How settlement works</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-7 sm:gap-6">
        {steps.map((s, i) => (
          <div key={s.num} className={i > 0 ? "sm:border-l sm:border-border sm:pl-6" : ""}>
            <div className="text-[12px] font-mono text-primary mb-2.5">{s.num}</div>
            <div className="text-[14px] font-semibold tracking-tight mb-1.5">{s.title}</div>
            <div className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
