export default function Hero() {
  return (
    <section className="text-center pt-10 pb-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 mb-6">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary glow-dot" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <span className="text-[11px] font-medium text-muted-foreground tracking-tight">
          ZK-verified settlement, live on Arc Testnet
        </span>
      </div>

      <h1 className="text-[40px] sm:text-[48px] font-semibold leading-[1.08] tracking-[-0.025em]">
        USDC only settles when
        <br />
        <span className="text-primary">work is proven</span>
      </h1>

      <p className="mt-4 text-[15px] text-muted-foreground max-w-[460px] mx-auto leading-relaxed">
        No human approval. No time-locks. A Groth16 proof gates every payment, end to end.
      </p>
    </section>
  );
}
