const STEP_ACCENTS = ["#62295b", "#824f77", "#463c7b"];
const ANIMS = ["animate-fade-up", "animate-fade-up [animation-delay:0.1s]", "animate-fade-up [animation-delay:0.2s]"];

export default function HowItWorks() {
  const steps = [
    { num: "01", title: "Client posts task", desc: "USDC locked in WorkRegistry with an outputHash and deadline." },
    { num: "02", title: "Agent proves work", desc: "Groth16 ZK proof shows knowledge of the pre-image, off-chain via snarkjs." },
    { num: "03", title: "USDC settles", desc: "Groth16Verifier checks the pairing on-chain. USDC transfers atomically." },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-4 sm:mb-5">How settlement works</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
        {steps.map((s, i) => (
          <div key={s.num} className={`${i > 0 ? "border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6" : ""} ${ANIMS[i]}`}>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-mono font-semibold text-white mb-2.5"
              style={{ background: STEP_ACCENTS[i] }}
            >
              {s.num}
            </div>
            <div className="text-sm font-semibold mb-1.5">{s.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
