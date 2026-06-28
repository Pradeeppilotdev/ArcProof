const STEP_ACCENTS = ["#62295b", "#824f77", "#463c7b"];
const ANIMS = ["animate-fade-up", "animate-fade-up [animation-delay:0.1s]", "animate-fade-up [animation-delay:0.2s]"];

export default function HowItWorks() {
  const steps = [
    { num: "01", title: "Post a challenge", desc: "Write a description and a secret answer. The answer is hashed with ZK and stored on-chain. Nobody can see it — not even the contract." },
    { num: "02", title: "Claim & prove", desc: "Someone claims the challenge. They enter the secret answer in their browser. A Groth16 proof is generated locally — the answer stays private." },
    { num: "03", title: "Settle automatically", desc: "The proof is verified on-chain. If valid, USDC is released instantly. No judge, no dispute, no waiting." },
  ];

  return (
    <section className="rounded-xl border border-border bg-card glass-edge p-4 sm:p-6 shadow-sm">
      <div className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-4 sm:mb-5">How it works</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        {steps.map((s, i) => (
          <div key={s.num} className={`${i > 0 ? "border-t sm:border-t-0 sm:border-l border-border pt-5 sm:pt-0 sm:pl-8" : ""} ${ANIMS[i]}`}>
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-mono font-semibold text-white mb-3"
              style={{ background: STEP_ACCENTS[i] }}
            >
              {s.num}
            </div>
            <div className="text-sm font-semibold mb-2.5">{s.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed pr-2">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
