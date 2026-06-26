export default function Hero() {
  return (
    <section className="text-center pt-12 pb-6 animate-fade-up">
      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-5">
        ZK-verified settlement on Arc
      </div>
      <h1 className="text-[36px] sm:text-[44px] font-semibold leading-[1.1] tracking-[-0.02em]">
        USDC only settles when<br />
        <span className="text-primary">work is proven</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        No human approval. No time-locks. A Groth16 proof gates every payment, end to end.
      </p>
    </section>
  );
}
